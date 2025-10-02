from flask import Flask, request, render_template, send_file, jsonify
from pdf2docx import Converter
from docx2pdf import convert
from docx import Document
import fitz  # PyMuPDF
import magic
import base64
import os
import uuid

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # Limite de 5 MB

UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'
TEMP_FOLDER = 'temp'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/pdf-to-word', methods=['POST'])
def pdf_to_word():
    file = request.files['file']
    filename = file.filename

    if not filename.lower().endswith('.pdf'):
        return "Tipo de arquivo inválido. Envie um PDF.", 400

    mime = magic.from_buffer(file.read(2048), mime=True)
    file.seek(0)

    if mime != 'application/pdf':
        return "O arquivo enviado não é um PDF válido.", 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    output_path = os.path.join(CONVERTED_FOLDER, filename.replace('.pdf', '.docx'))
    cv = Converter(filepath)
    cv.convert(output_path)
    cv.close()

    return send_file(output_path, as_attachment=True)

@app.route('/word-to-pdf', methods=['POST'])
def word_to_pdf():
    file = request.files['file']
    filename = file.filename

    if not filename.lower().endswith('.docx'):
        return "Tipo de arquivo inválido. Envie um documento Word (.docx).", 400

    mime = magic.from_buffer(file.read(2048), mime=True)
    file.seek(0)

    if mime != 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return "O arquivo enviado não é um Word válido.", 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    pdf_filename = filename.rsplit('.', 1)[0] + '.pdf'
    output_path = os.path.join(CONVERTED_FOLDER, pdf_filename)

    try:
        convert(filepath, output_path)
    except Exception as e:
        print("Erro na conversão:", e)
        return "Erro ao converter o arquivo. Verifique se o Microsoft Word está instalado corretamente.", 500

    return send_file(output_path, as_attachment=True)

@app.route('/preview', methods=['POST'])
def preview():
    file = request.files['file']
    filename = file.filename.lower()

    if filename.endswith('.pdf'):
        try:
            doc = fitz.open(stream=file.read(), filetype="pdf")
            page = doc.load_page(0)
            pix = page.get_pixmap()
            img_data = pix.tobytes("png")
            encoded = base64.b64encode(img_data).decode('utf-8')
            return jsonify({'type': 'pdf', 'preview': encoded})
        except Exception:
            return jsonify({'error': 'Erro ao gerar prévia do PDF.'}), 500

    elif filename.endswith('.docx'):
        try:
            doc = Document(file)
            text = "\n".join([p.text for p in doc.paragraphs[:5] if p.text.strip()])
            if not text:
                text = "⚠️ Nenhum texto visível encontrado no documento."
            return jsonify({'type': 'docx', 'preview': text})
        except Exception as e:
            print("Erro na prévia do Word:", e)
            return jsonify({'error': 'Erro ao gerar prévia do Word.'}), 500

    else:
        return jsonify({'error': 'Tipo de arquivo não suportado.'}), 400

@app.errorhandler(413)
def too_large(e):
    return "Arquivo muito grande! O limite é 5 MB.", 413

if __name__ == '__main__':
    app.run(debug=True)
