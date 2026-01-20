import csv
import os

INPUT_CSV = '../02_investment_tool/data/companies.csv'
OUTPUT_CSV = 'data/companies.csv'

EXCLUDED_COLUMNS = [
    '企業情報',
    '日経会社情報'
]

def create_public_csv():
    print('=== 公開版CSVファイル作成 ===')
    print()

    if not os.path.exists(INPUT_CSV):
        print(f'エラー: {INPUT_CSV} が見つかりません')
        return

    with open(INPUT_CSV, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)

        headers = reader.fieldnames
        print(f'元のカラム数: {len(headers)}')

        public_headers = [h for h in headers if h not in EXCLUDED_COLUMNS]
        print(f'公開版カラム数: {len(public_headers)}')
        print(f'除外されたカラム: {", ".join(EXCLUDED_COLUMNS)}')
        print()

        os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

        with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=public_headers)
            writer.writeheader()

            row_count = 0
            for row in reader:
                public_row = {k: v for k, v in row.items() if k in public_headers}
                writer.writerow(public_row)
                row_count += 1

            print(f'処理完了: {row_count}行を書き込みました')

    original_size = os.path.getsize(INPUT_CSV)
    public_size = os.path.getsize(OUTPUT_CSV)

    print()
    print(f'元のファイルサイズ: {original_size:,} bytes')
    print(f'公開版ファイルサイズ: {public_size:,} bytes')
    print(f'削減率: {(1 - public_size / original_size) * 100:.1f}%')
    print()
    print(f'公開版CSV作成完了: {OUTPUT_CSV}')

if __name__ == '__main__':
    create_public_csv()
