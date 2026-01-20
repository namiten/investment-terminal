import csv
import os
import re

INPUT_CSV = '../02_investment_tool/data/companies.csv'
OUTPUT_CSV = 'data/companies.csv'

def extract_nikkei_industry_middle(nikkei_desc):
    if not nikkei_desc:
        return ''
    match = re.search(r'【日経業種分類】([^\n【]+)', nikkei_desc)
    if match:
        return match.group(1).strip()
    return ''

def extract_listed_markets(nikkei_desc):
    if not nikkei_desc:
        return ''
    match = re.search(r'【上場市場名】\s*(.+?)(?:\n|【|$)', nikkei_desc)
    if match:
        return match.group(1).strip()
    return ''

def extract_index_adoption(nikkei_desc):
    if not nikkei_desc:
        return ''
    match = re.search(r'【指数採用】\s*([^\n【]*)', nikkei_desc)
    if match:
        return match.group(1).strip()
    return ''

def create_public_csv():
    print('=== 公開版CSVファイル作成（v2） ===')
    print()

    if not os.path.exists(INPUT_CSV):
        print(f'エラー: {INPUT_CSV} が見つかりません')
        return

    with open(INPUT_CSV, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)

        original_headers = reader.fieldnames
        print(f'元のカラム数: {len(original_headers)}')

        base_headers = [h for h in original_headers if h not in ['企業情報', '日経会社情報']]

        public_headers = base_headers + [
            '日経業種（中分類）_抽出',
            '上場市場名_抽出',
            '指数採用_抽出'
        ]

        print(f'公開版カラム数: {len(public_headers)}')
        print()

        os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

        with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=public_headers)
            writer.writeheader()

            row_count = 0
            for row in reader:
                nikkei_desc = row.get('日経会社情報', '')

                public_row = {k: v for k, v in row.items() if k in base_headers}

                public_row['日経業種（中分類）_抽出'] = extract_nikkei_industry_middle(nikkei_desc)
                public_row['上場市場名_抽出'] = extract_listed_markets(nikkei_desc)
                public_row['指数採用_抽出'] = extract_index_adoption(nikkei_desc)

                writer.writerow(public_row)
                row_count += 1

            print(f'処理完了: {row_count}社を書き込みました')

    original_size = os.path.getsize(INPUT_CSV)
    public_size = os.path.getsize(OUTPUT_CSV)

    print()
    print(f'元のファイルサイズ: {original_size:,} bytes')
    print(f'公開版ファイルサイズ: {public_size:,} bytes')
    print(f'削減率: {(1 - public_size / original_size) * 100:.1f}%')
    print()
    print(f'公開版CSV作成完了: {OUTPUT_CSV}')

    print()
    print('サンプルデータ確認:')
    with open(OUTPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        if len(rows) > 0:
            sample = rows[0]
            code = list(sample.keys())[0]
            print(f'  最初の銘柄コード: {sample.get(code, "N/A")}')
            print(f'  日経業種（中分類）: {sample.get("日経業種（中分類）_抽出", "N/A")}')
            print(f'  上場市場名: {sample.get("上場市場名_抽出", "N/A")}')
            print(f'  指数採用: {sample.get("指数採用_抽出", "N/A")}')

if __name__ == '__main__':
    create_public_csv()
