from flask import Flask, render_template

app = Flask(__name__,static_folder='resources')

# SSL証明書と秘密鍵のファイルパスを指定します
ssl_certfile = 'ssl\cert.pem'  # 証明書のパス
ssl_keyfile = 'ssl\privkey.pem'  # 秘密鍵のパス

# 追加のHTTPヘッダーを設定
# @app.after_request
# def apply_cors_headers(response):
#     response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
#     response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
#     return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route("/SnoozzMainView")
def SnoozzMainView():
    return render_template('SnoozzMainView.html')

@app.route("/DevView")
def DevView():
    return render_template('DevView.html')

@app.route("/HolisticDemo")
def HolisticDemo():
    return render_template('HolisticDemo.html')

@app.route("/EffectMeasurement")
def EffectMeasurement():
    return render_template('EffectMeasurement.html')

@app.route("/VideoInput")
def VideoInput():
    return render_template('VideoInput.html')


if __name__ == '__main__':
    app.run(ssl_context=(ssl_certfile, ssl_keyfile),debug=False, host='0.0.0.0', port=443)
