import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// --- Supabase 初期化 ---
export const supabaseUrl = 'https://gyogtttxgenbgpryclcr.supabase.co'
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2d0dHR4Z2VuYmdwcnljbGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDYxMDEsImV4cCI6MjA3NjUyMjEwMX0.MUemu4Y1Qu4Zm0aN29dwNoLg2n51VorJvxTeaf62Pvw'
export const supabase = createClient(supabaseUrl, supabaseKey)


// ==============================
// 🔸 カテゴリ・支払者の取得
// ==============================

/** カテゴリ一覧を取得（isFixed=trueで固定費カテゴリ） */
export async function loadCategories(isFixed = false) {
  const table = isFixed ? 'infra_category' : 'category'
  const { data, error } = await supabase
    .from(table)
    .select('categoryid, categoryname')
    .order('categoryid', { ascending: true })
  if (error) throw new Error('カテゴリ取得エラー: ' + error.message)
  return data
}

/** 支払者一覧を取得 */
export async function loadPayers() {
  const { data, error } = await supabase
    .from('payer')
    .select('payerid, payername')
    .order('payerid', { ascending: true })
  if (error) throw new Error('支払者取得エラー: ' + error.message)
  return data
}


// ==============================
// 🔸 家計簿データ関連
// ==============================

/** 個人負担表 */
export async function loadBurdenTable(month) {
  const { data, error } = await supabase
    .from('monthly_burden')
    .select('*')
    .eq('year_month', month)
  if (error) throw new Error('個人負担表取得エラー: ' + error.message)
  return data
}

/** 合計表 */
export async function loadTotalTable(month) {
  const { data, error } = await supabase
    .from('total_expenditure')
    .select('*')
    .eq('year_month', month)
  if (error) throw new Error('合計表取得エラー: ' + error.message)
  return data
}

/** 固定費/変動費の家計簿明細を取得 */
export async function loadKakeiTable(isFixed = false, month = null) {
  const flag = isFixed ? 2 : 1
  let query = supabase.from('kakeicontent').select('*').eq('fixedcostflg', flag).order('date', { ascending: true })

  // タイムゾーンに依存しない「YYYY-MM-DD」文字列で範囲を作成
  if (month && month.trim() !== '') {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const m = Number(monthStr);           // 1〜12
    const lastDay = new Date(year, m, 0).getDate();  // その月の最終日(ローカルでもOK)
    const pad = (n) => String(n).padStart(2, '0');
    const start = `${year}-${pad(m)}-01`;
    const end   = `${year}-${pad(m)}-${pad(lastDay)}`;
    query = query.gte('date', start).lte('date', end);
  }

  const { data, error } = await query
  if (error) throw new Error('家計簿明細取得エラー: ' + error.message)
  return data
}

/** 編集ボタン押下時の入力欄反映処理 */
export async function editRow(selectedRow) {
  const { date, seq } = selectedRow;
  const monthInput = document.getElementById('datemonth');

  // 固定費・変動費両方から検索
  const all = await loadKakeiTable(false, monthInput.value);
  const fix = await loadKakeiTable(true, monthInput.value);
  const target = [...all, ...fix].find(r => r.date === date && r.seq === seq);

  if (!target) {
    alert('編集対象のデータが見つかりません');
    return;
  }

  // 共通部分（存在チェック付き）
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };

  setVal('datepicker', target.date);
  setVal('category', target.categoryid);
  setVal('categorySelect', target.categoryid); // モバイル対応
  setVal('payer', target.payerid);
  setVal('payerSelect', target.payerid); // モバイル対応
  setVal('text', target.content);
  setVal('noteInput', target.content); // モバイル対応

  setVal('income', target.income);
  setVal('incomeInput', target.income); // モバイル対応
  setVal('meal', target.meal);
  setVal('mealInput', target.meal);
  setVal('supplies', target.supplies);
  setVal('suppliesInput', target.supplies);
  setVal('play', target.play);
  setVal('playInput', target.play);
  setVal('infra', target.infra);
  setVal('infraInput', target.infra);
  setVal('education', target.education);
  setVal('educationInput', target.education);
  setVal('others', target.others);
  setVal('othersInput', target.others);

  // メッセージ・編集フラグ
  const msg = document.getElementById('message');
  if (msg) msg.textContent = `編集中：${target.date} (No.${target.seq})`;

  window.editTarget = { date, seq };

  window.scrollTo({ top: 0, behavior: 'smooth' });
}



/** 家計簿データの登録 */
export async function insertKakei(row) {
  const { error } = await supabase.from('kakei').insert([row])
  if (error) throw new Error('登録エラー: ' + error.message)
}

/** 家計簿データの更新 */
export async function updateKakei(oldDate, seq, row) {
  const { error } = await supabase
    .from('kakei')
    .update(row)
    .eq('date', oldDate)
    .eq('seq', seq)
  if (error) throw new Error('更新エラー: ' + error.message)
}

/** 家計簿データの削除 */
export async function deleteKakei(date, seq) {
  const { error } = await supabase
    .from('kakei')
    .delete()
    .eq('date', date)
    .eq('seq', seq)
  if (error) throw new Error('削除エラー: ' + error.message)
}

/** 日付ごとの次シーケンス取得 */
export async function getNextSeq(date) {
  const { data, error } = await supabase
    .from('kakei')
    .select('seq')
    .eq('date', date)
    .order('seq', { ascending: false })
    .limit(1)
  if (error) throw new Error('ID取得エラー: ' + error.message)
  return data && data.length > 0 ? data[0].seq + 1 : 1
}


// ==============================
// 🔸 月切り替え補助
// ==============================

/** 指定月から前後の月を取得 */
export function changeMonth(currentMonth, offset) {
  const [y, m] = currentMonth.split('-').map(Number)
  const newDate = new Date(y, m - 1 + offset)
  return `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
}


// ==============================
// 🔸 UI補助
// ==============================

/** 数値を日本語表記で整形 */
export function formatNum(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  return isNaN(num) ? '' : num.toLocaleString('ja-JP')
}

/** 金額入力の合計計算 */
export function calcTotal({ income, meal, supplies, play, infra, education, others }) {
  return (income || 0) + (meal || 0) + (supplies || 0) + (play || 0) + (infra || 0) + (education || 0) + (others || 0)
}


// ==============================
// 🔸 日付初期化ヘルパー
// ==============================

/**
 * ページロード時に日付入力欄へシステム日付をセットする
 * @param {string} dateSelector - 日付inputのid（例: '#datepicker'）
 * @param {string} monthSelector - 月inputのid（例: '#datemonth'）
 */
export function setToday(dateSelector = '#datepicker', monthSelector = '#datemonth') {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  const today = `${y}-${m}-${d}`;
  const month = `${y}-${m}`;

  const dateEl = document.querySelector(dateSelector);
  const monthEl = document.querySelector(monthSelector);
  if (dateEl) dateEl.value = today;
  if (monthEl) monthEl.value = month;
}

// ==============================
// 🔸 家計簿リスト描画（編集・削除ボタン付き）
// ==============================
export function renderKakeiList(selector, data, formatNum) {
  const tbody = document.querySelector(selector);
  tbody.innerHTML = '';
  if (!data) return;

  data.forEach(r => {
    const tr = document.createElement('tr');

    // ✅ チェックボックス列を保持
    tr.innerHTML = `
      <td><input type="checkbox" class="row-check" data-date="${r.date}" data-seq="${r.seq}"></td>
      <td>${r.date ? r.date.slice(5) : ''}</td>
      <td>${r.categoryname || ''}</td>
      <td>${r.content || ''}</td>
      <td>${r.payername || ''}</td>
      <td class="numcell">${formatNum(r.income)}</td>
      <td class="numcell">${formatNum(r.meal)}</td>
      <td class="numcell">${formatNum(r.supplies)}</td>
      <td class="numcell">${formatNum(r.play)}</td>
      <td class="numcell">${formatNum(r.infra)}</td>
      <td class="numcell">${formatNum(r.education)}</td>
      <td class="numcell">${formatNum(r.others)}</td>
    `;

    // ✅ 0円セルを空欄化（固定費表だけグレーアウト）
    tr.querySelectorAll('.numcell').forEach(td => {
      const val = td.textContent.replace(/,/g, '').trim();
      if (val === '' || val === '0') {
        td.textContent = '';
        if (selector === '#koteiTable tbody') {
          td.style.backgroundColor = '#f0f0f0';
          td.style.color = '#888';
        }
      }
    });

    tbody.appendChild(tr);
  });
}


// ==============================
// 🔸 個人負担表描画
// ==============================
export function renderBurdenTable(data) {
  const tbody = document.querySelector('#burdenTable tbody');
  tbody.innerHTML = '';
  if (!data) return;

  data.forEach(async (r) => {
    const tr = document.createElement('tr');
    if (r.settled) tr.classList.add('settled-row'); // グレーアウト

    const tdPayer = document.createElement('td');
    tdPayer.textContent = r.payername;

    const tdAmount = document.createElement('td');
    // 🔸 0の場合も明示的に「0」を表示
    tdAmount.textContent =
      r.total_sum != null ? Number(r.total_sum).toLocaleString('ja-JP') : '0';

    const tdCheck = document.createElement('td');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = r.settled || false;

    chk.addEventListener('change', async () => {
      const checked = chk.checked;
      tr.classList.toggle('settled-row', checked);
      const { error } = await supabase
        .from('monthly_settled')
        .update({ settled: checked })
        .eq('payerid', r.payerid)
        .eq('year_month', r.year_month);
      if (error) console.error('更新エラー:', error);
    });

    tdCheck.appendChild(chk);
    tr.append(tdPayer, tdAmount, tdCheck);
    tbody.appendChild(tr);
  });
}

// ==============================
// 🔸 合計表描画
// ==============================
export function renderTotalTable(data) {
  const tbody = document.querySelector('#totalTable tbody');
  tbody.innerHTML = '';
  if (!data) return;

  data.forEach(r => {
    const tr = document.createElement('tr');

    // 値を安全に取得（null対策）
    const income = r.income_total ?? 0;
    const meal = r.meal_total ?? 0;
    const supplies = r.supplies_total ?? 0;
    const play = r.play_total ?? 0;
    const infra = r.infra_total ?? 0;
    const education = r.education_total ?? 0;
    const others = r.others_total ?? 0;
    const expenditure = r.expenditure ?? 0;

    // ✅ 支出合計（収入以外の合計）
    const expenseTotal = meal + supplies + play + infra + education + others;

    // 表示順
    const cols = [
      income,
      meal,
      supplies,
      play,
      infra,
      education,
      others,
      expenseTotal,  // ← 新規列
      expenditure
    ];

    cols.forEach((val, i) => {
      const td = document.createElement('td');
      td.textContent = val.toLocaleString('ja-JP');
      // 収支（最後の列）がマイナスなら赤字表示
      if (i === cols.length - 1 && val < 0) td.style.color = 'red';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

/** 指定年月の monthly_settled レコードを確保（存在しなければ全支払者分作成） */
export async function ensureMonthlySettled(yearMonth) {
  try {
    const ym = yearMonth.replace('/', '-'); // ✅ "/"を"-"に統一

    const { data: payers, error: payerErr } = await supabase
      .from('payer')
      .select('payerid');
    if (payerErr) throw new Error('支払者取得エラー: ' + payerErr.message);

    const { data: existing, error: existErr } = await supabase
      .from('monthly_settled')
      .select('payerid')
      .eq('year_month', ym);
    if (existErr) throw new Error('既存確認エラー: ' + existErr.message);

    const existingIds = existing.map(e => e.payerid);
    const newRecords = payers
      .filter(p => !existingIds.includes(p.payerid))
      .map(p => ({
        payerid: p.payerid,
        year_month: ym,
        settled: false
      }));

    if (newRecords.length > 0) {
      const { error: insertErr } = await supabase
        .from('monthly_settled')
        .insert(newRecords);
      if (insertErr) throw new Error('初期レコード作成エラー: ' + insertErr.message);
      console.log(`monthly_settled: ${newRecords.length}件を自動登録`);
    }
  } catch (err) {
    console.error('ensureMonthlySettled エラー:', err.message);
  }
}