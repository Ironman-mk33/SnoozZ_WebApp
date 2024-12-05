# SnoozZ_WebApp
居眠り防止を目的とした、眠気検知のデモアプリ

# 環境構築
Python3.8をインストールする

ssl認証をしています
西村から証明書をもらうか、自分で作成してください
https://memorandom.whitepenguins.com/posts/windows-pem-python/

ターミナルを立ち上げて以下のコマンドを順に実行
py -3.8 -m venv env
.\env\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

EXE化するコマンド
pyinstaller -F --add-data "ssl:ssl" --add-data "templates:templates" --add-data "tools:tools"  --onefile app.py

作成者：西村久樹
