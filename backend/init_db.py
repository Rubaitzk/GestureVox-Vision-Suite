import mysql.connector
import os

# Use the same DB config as app.py; update if needed
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASS', 'mysql_4@'),
    'database': os.environ.get('DB_NAME', 'gestvox'),
}

DDL_PATH = os.path.join(os.path.dirname(__file__), '..', 'DDL.sql')


def apply_ddl():
    print('Connecting to database...')
    conn = mysql.connector.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
    )
    conn.autocommit = True
    cursor = conn.cursor()

    # Ensure database exists
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        print(f"Database '{DB_CONFIG['database']}' ensured.")
        cursor.execute(f"USE {DB_CONFIG['database']}")
    except Exception as e:
        print('Error ensuring database:', e)
        cursor.close()
        conn.close()
        return

    # Read and execute DDL
    with open(DDL_PATH, 'r', encoding='utf-8') as f:
        ddl = f.read()

    # Split statements on semicolon safely
    statements = [s.strip() for s in ddl.split(';') if s.strip()]
    for stmt in statements:
        try:
            cursor.execute(stmt)
        except Exception as e:
            # Ignore 'already exists' and seed duplicates, but print other errors
            print('Statement failed:', stmt[:120].replace('\n', ' '), '...')
            print('Error:', e)

    cursor.close()
    conn.close()
    print('DDL applied (best-effort).')


if __name__ == '__main__':
    apply_ddl()
