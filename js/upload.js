import { supabase } from './common.js';

const fileInput = document.getElementById('excelFile');
const uploadBtn = document.getElementById('uploadBtn');
const message = document.getElementById('message');

const expectedHeaders = [
  '年月日', 'カテゴリ', '内容', '支払者', '収入', '食事', '生活用品', '遊び',
  '生活費', '子供', 'その他', '種別', '連番', 'カテゴリID', '支払者ID', '固定費フラグ'
];

/**
 * 📅 日付セルを yyyy/mm/dd に変換（空欄・不正→null）
 */
function formatDateCell(value) {
  if (!value) return null;

  if (typeof value === "number") {
    const epoch = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (isNaN(epoch)) return null;
    return `${epoch.getFullYear()}/${String(epoch.getMonth() + 1).padStart(2, '0')}/${String(epoch.getDate()).padStart(2, '0')}`;
  }

  const str = String(value).trim();
  if (!str) return null;

  const normalized = str.replaceAll('-', '/').replace(/[年月日]/g, '/');
  const parts = normalized.split('/').filter(p => p);
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
  }

  const d = new Date(normalized);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Excelを読み込んで Supabase に一括登録（バリデーション付き）
 */
uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    message.textContent = 'Excelファイルを選択してください。';
    return;
  }

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rows.length === 0) {
        message.textContent = 'データが空です。';
        return;
      }

      // ✅ ヘッダー確認
      const headers = Object.keys(rows[0]);
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        message.textContent = `列名が一致しません。必要な列: ${expectedHeaders.join(', ')}`;
        return;
      }

      // ✅ 連番が未設定の行はスキップ
      const validRows = rows.filter(r => Number(r['連番']) > 0);
      if (validRows.length === 0) {
        message.textContent = '登録可能な行がありません（連番未設定）';
        return;
      }

      // ✅ バリデーション（エラー収集）
      const errors = [];
      validRows.forEach((row, index) => {
        const line = index + 2; // Excel行番号（ヘッダー行を1行とみなす）

        const incomeVals = [
          row['収入'], row['食事'], row['生活用品'], row['遊び'],
          row['生活費'], row['子供'], row['その他']
        ].map(v => Number(v) || 0);

        const allZero = incomeVals.every(v => v === 0);
        if (allZero) errors.push(`${line}行目: 金額がすべて未設定です。`);

        const noCategoryAndContent = !row['カテゴリID'] && !row['内容'];
        if (noCategoryAndContent) errors.push(`${line}行目: カテゴリIDと内容が未設定です。`);

        const fixedFlg = String(row['固定費フラグ']).trim();
        if (!fixedFlg || isNaN(Number(fixedFlg))) errors.push(`${line}行目: 固定費フラグが未設定です。`);
      });

      // ✅ エラーがあれば中断
      if (errors.length > 0) {
        message.innerHTML = `アップロードできませんでした:<br>${errors.join('<br>')}`;
        return;
      }

      // ✅ データ整形（年月日がnullならスキップ）
      const formattedRows = validRows
        .map(row => ({
          date: formatDateCell(row['年月日']),
          seq: Number(row['連番']) || 0,
          categoryid: row['カテゴリID'] ? String(row['カテゴリID']).trim() : null,
          content: row['内容'] || '',
          payerid: row['支払者ID'] ? String(row['支払者ID']).trim() : null,
          income: Number(row['収入']) || 0,
          meal: Number(row['食事']) || 0,
          supplies: Number(row['生活用品']) || 0,
          play: Number(row['遊び']) || 0,
          infra: Number(row['生活費']) || 0,
          education: Number(row['子供']) || 0,
          others: Number(row['その他']) || 0,
          fixedcostflg: Number(row['固定費フラグ']) || 0
        }))
        .filter(r => r.date !== null);

      if (formattedRows.length === 0) {
        message.textContent = '登録可能なデータがありません（年月日が空欄）';
        return;
      }

      console.log('送信前データ:', formattedRows);

      // ✅ Supabase UPSERT
      const { data: upserted, error } = await supabase
        .from('kakei')
        .upsert(formattedRows, { onConflict: ['date', 'seq'] })
        .select('*');

      console.log('Supabase応答:', { upserted, error });

      if (error) {
        console.error('Supabaseエラー詳細:', error);
        message.textContent = 'アップロード中にエラー: ' + error.message;
      } else {
        message.innerHTML = `✅ アップロード完了 (${upserted.length}件登録/更新)<br>`;
        fileInput.value = "";
      }

    } catch (err) {
      console.error('JS実行エラー:', err);
      message.textContent = 'アップロード失敗: ' + err.message;
    }
  };

  reader.readAsArrayBuffer(file);
});
