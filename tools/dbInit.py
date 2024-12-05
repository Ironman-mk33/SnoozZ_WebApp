import sqlite3

conn = sqlite3.connect('luggageTable.sqlite3')
cursor = conn.cursor()
cursor.execute('''DROP TABLE luggage''')

# テーブルを作成
cursor.execute('''CREATE TABLE IF NOT EXISTS luggage (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    description TEXT,
                    imagepath TEXT,
                    ismoved BOOLEAN)''')

#cursor.execute("INSERT INTO luggage (id,name,description,imagepath,ismoved) VALUES (?,?,?,?,?)", ('Product 1', 19.99,1,2,3))

# データベースへの変更を保存
conn.commit()

# データベース接続を閉じる
conn.close()