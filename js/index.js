import {
  loadCategories, loadPayers, loadBurdenTable, loadTotalTable, loadKakeiTable,
  insertKakei, updateKakei, deleteKakei, getNextSeq, changeMonth,
  setToday, renderKakeiList, renderBurdenTable, renderTotalTable, formatNum,ensureMonthlySettled 
} from './common.js';

const msg = document.getElementById('message');
const form = document.getElementById('kakeiboForm');
const monthInput = document.getElementById('datemonth');

// 初期表示
window.addEventListener('DOMContentLoaded', async () => {
  setToday('#datepicker', '#datemonth');
  await initDisplay();
});

// ▼ ラジオボタン変更時にカテゴリ切替
document.querySelectorAll('input[name="costType"]').forEach(radio => {
  radio.addEventListener('change', async () => {
    await initDisplay();
  });
});

async function initDisplay() {
  const month = monthInput.value;
  const isFixed = document.getElementById('fixedCost').checked;

  await ensureMonthlySettled(month);

  const [categories, payers, variable, fixed, burden, total] = await Promise.all([
    loadCategories(isFixed),
    loadPayers(),
    loadKakeiTable(false, month),
    loadKakeiTable(true, month),
    loadBurdenTable(month),
    loadTotalTable(month)
  ]);

  document.getElementById('category').innerHTML =
    categories.map(c => `<option value="${c.categoryid}">${c.categoryname}</option>`).join('');
  document.getElementById('payer').innerHTML =
    payers.map(p => `<option value="${p.payerid}">${p.payername}</option>`).join('');

  renderKakeiList('#kakeiTable tbody', variable, formatNum);
  renderKakeiList('#koteiTable tbody', fixed, formatNum);
  renderBurdenTable(burden);
  renderTotalTable(total);
}

// ▼ 月変更処理
document.getElementById('prevMonth').addEventListener('click', async () => {
  monthInput.value = changeMonth(monthInput.value, -1);
  await initDisplay();
});
document.getElementById('nextMonth').addEventListener('click', async () => {
  monthInput.value = changeMonth(monthInput.value, 1);
  await initDisplay();
});
monthInput.addEventListener('change', async () => await initDisplay());

// ▼ 登録/更新処理
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';

  const row = {
    date: document.getElementById('datepicker').value,
    categoryid: document.getElementById('category').value,
    payerid: document.getElementById('payer').value,
    content: document.getElementById('text').value,
    income: +document.getElementById('income').value || 0,
    meal: +document.getElementById('meal').value || 0,
    supplies: +document.getElementById('supplies').value || 0,
    play: +document.getElementById('play').value || 0,
    infra: +document.getElementById('infra').value || 0,
    education: +document.getElementById('education').value || 0,
    others: +document.getElementById('others').value || 0,
    fixedcostflg: document.getElementById('fixedCost').checked ? 2 : 1
  };

  if (!row.date) return msg.textContent = '日付を入力してください。';
  if (!row.categoryid && !row.content) return msg.textContent = 'カテゴリまたは内容を入力してください。';
  if (Object.values(row).slice(4, 11).every(v => v === 0))
    return msg.textContent = '金額を1つ以上入力してください。';

  try {
    row.seq = await getNextSeq(row.date);
    await insertKakei(row);
    msg.textContent = '登録しました。';
    await initDisplay();
  } catch (err) {
    console.error(err);
    msg.textContent = 'エラー: ' + err.message;
  }
});
