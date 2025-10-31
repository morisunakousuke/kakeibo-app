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

  if (month) {
    const [year, m] = month.split('-').map(Number)
    const start = new Date(year, m - 1, 1).toISOString().split('T')[0]
    const end = new Date(year, m, 0).toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  }

  const { data, error } = await query
  if (error) throw new Error('家計簿明細取得エラー: ' + error.message)
  return data
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
    tr.innerHTML = `
      <td><input type="checkbox" class="row-check" data-date="${r.date}" data-seq="${r.seq}"></td>
      <td>${r.date}</td>
      <td>${r.categoryname}</td>
      <td>${r.content || ''}</td>
      <td>${r.payername}</td>
      <td>${formatNum(r.income)}</td>
      <td>${formatNum(r.meal)}</td>
      <td>${formatNum(r.supplies)}</td>
      <td>${formatNum(r.play)}</td>
      <td>${formatNum(r.infra)}</td>
      <td>${formatNum(r.education)}</td>
      <td>${formatNum(r.others)}</td>
      <td>${formatNum(r.total)}</td>
    `;
    tbody.appendChild(tr);
  });
}