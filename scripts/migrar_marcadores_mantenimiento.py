"""
migrar_marcadores_mantenimiento.py — añade la columna `aplazado_a` a
`registro_mantenimientos` para poder marcar un periodo programado como
'no_aplica' o 'aplazado' (estado + motivo en `observaciones` + mes destino).

Idempotente: usa `add column if not exists`. Ejecutar una sola vez.
"""
from base import conectar

SQL = "alter table registro_mantenimientos add column if not exists aplazado_a date;"


def main():
    conn = conectar()
    with conn.cursor() as cur:
        cur.execute(SQL)
    conn.commit()
    with conn.cursor() as cur:
        cur.execute("""
            select column_name, data_type
            from information_schema.columns
            where table_name = 'registro_mantenimientos'
            order by ordinal_position
        """)
        cols = cur.fetchall()
    conn.close()
    print("✅ Migración aplicada. Columnas de registro_mantenimientos:")
    for name, dtype in cols:
        print(f"   {name}: {dtype}")


if __name__ == "__main__":
    main()
