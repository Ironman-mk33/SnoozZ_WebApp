# SnoozZ_WebApp
居眠り防止を目的とした、眠気検知のデモアプリ

# 環境構築
Python3.8をインストールする

ssl認証をしています
西村から証明書をもらう
https://drive.google.com/drive/folders/11ngULp-8UO3S9fPGXLvIM3P1GaxD3E_M
自分で作成してください
https://memorandom.whitepenguins.com/posts/windows-pem-python/

ターミナルを立ち上げて以下のコマンドを順に実行
py -3.8 -m venv env
.\env\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

※失敗したら、PowerShellを管理者権限で開いて「PowerShell Set-ExecutionPolicy RemoteSigned」を実行

EXE化するコマンド
.\env\Scripts\activate
pyinstaller -F --add-data "ssl:ssl" --add-data "templates:templates" --add-data "tools:tools" --add-data "resources:resources" --onefile app.py

timestampをエクセルで正しく表示する方法
・timestampに対して右の式を適用　= A2/(1000*24*60*60) + DATE(1970,1,1)+ TIME(9,0,0)
・表示形式でユーザ定義を選択  yyyy/m/d h:mm:ss.000;@   とする

作成者：西村久樹
