import { supabase } from './common.js';

const exportBtn = document.getElementById('exportBtn');
const status = document.getElementById('status');

// ✅ fromを設定したら自動でtoにも反映
document.addEventListener('DOMContentLoaded', () => {
  const fromInput = document.getElementById('from');
  const toInput = document.getElementById('to');

  fromInput.addEventListener('change', () => {
    if (!toInput.value || toInput.value < fromInput.value) {
      toInput.value = fromInput.value;
    }
  });
});


/** 指定年月(YYYY-MM)の末日を返す */
function getLastDayOfMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

/** 日付を yyyy/mm/dd 形式に整形 */
function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/** 保存処理（上書き確認付き） */
async function saveWithPicker(blob, suggestedName) {
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: 'Excelファイル',
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
      }
    ]
  });

  const file = await handle.getFile();
  if (file && file.size > 0) {
    const overwrite = confirm(`同名ファイル「${suggestedName}」が存在します。\n上書きしますか？`);
    if (!overwrite) throw new Error('既存ファイルが存在するためキャンセルされました。');
  }

  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** Excel出力メイン処理 */
exportBtn.addEventListener('click', async () => {
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;

  if (!from || !to) {
    status.textContent = '期間を指定してください。';
    return;
  }

  status.textContent = 'データ取得中...';
  console.clear();

  try {
    // ✅ 1️⃣ テンプレート読み込み
    const response = await fetch('../templates/出力用テンプレート.xlsx');
    if (!response.ok) throw new Error('テンプレートが見つかりません。');
    const templateBuf = await response.arrayBuffer();
    const wb = XLSX.read(templateBuf, { type: 'array', cellStyles: true });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    console.log('読み込んだテンプレートシート名:', sheetName);

    // ✅ 2️⃣ Supabaseデータ取得
    const lastDay = getLastDayOfMonth(to);
    const { data, error } = await supabase
      .from('kakeicontent')
      .select('date, categoryname, content, payername, income, meal, supplies, play, infra, education, others, fixedcostflg, seq')
      .gte('date', `${from}-01`)
      .lte('date', `${to}-${String(lastDay).padStart(2, '0')}`)
      .order('date', { ascending: true });

    if (error) throw error;
    console.log('Supabase取得結果件数:', data?.length);

    if (!data || data.length === 0) {
      status.textContent = '該当データがありません。';
      return;
    }

    // ✅ 3️⃣ 出力データを整形（日本語カラム）
    const jsonData = data.map(row => ({
      年月日: formatDate(row.date),
      カテゴリ: row.categoryname || '',
      内容: row.content || '',
      支払者: row.payername || '',
      収入: row.income ? row.income : '',
      食事: row.meal ? row.meal : '',
      生活用品: row.supplies ? row.supplies : '',
      遊び: row.play ? row.play : '',
      生活費: row.infra ? row.infra : '',
      子供: row.education ? row.education : '',
      その他: row.others ? row.others : '',
      種別: row.fixedcostflg === 1 ? '固定費' : '変動費',
      連番: row.seq || ''
    }));

    console.log('Excel出力データ例:', jsonData.slice(0, 3));

    // ✅ 4️⃣ 書式保持しつつ値のみ上書き
    const startRow = 2; // 2行目から貼り付け
    const colKeys = Object.keys(jsonData[0]);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      for (let j = 0; j < colKeys.length; j++) {
        const colLetter = XLSX.utils.encode_col(j); // A, B, C...
        const cellAddr = `${colLetter}${startRow + i}`;
        const value = row[colKeys[j]];

        if (!ws[cellAddr]) ws[cellAddr] = {};
        // ✅ 既存セルの書式・関数・色を保持して値だけ更新
        ws[cellAddr].v = value;
        ws[cellAddr].t = typeof value === 'number' ? 'n' : 's';
      }
    }

    // ✅ 5️⃣ 出力範囲を再設定
    const endRow = startRow + jsonData.length - 1;
    const endCol = colKeys.length - 1;
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: endRow, c: endCol } });

    // ✅ 6️⃣ 保存
    const now = new Date();
    const filename = `家計簿_${from}_${to}_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`;
    const blob = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    await saveWithPicker(blob, filename);

    status.textContent = `${data.length}件をテンプレートに出力しました。`;

  } catch (err) {
    console.error('出力エラー:', err);
    status.textContent = 'エラーが発生しました: ' + err.message;
  }
});
