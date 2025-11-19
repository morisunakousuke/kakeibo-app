import {
  loadCategories, loadPayers, loadBurdenTable, loadTotalTable, loadKakeiTable,
  insertKakei, updateKakei, deleteKakei, getNextSeq, changeMonth,
  setToday, renderKakeiList, renderBurdenTable, renderTotalTable, formatNum, ensureMonthlySettled,
  editRow
} from './common.js';

const msg = document.getElementById('message');
const form = document.getElementById('kakeiboForm');
const monthInput = document.getElementById('datemonth');

// ================================
// 初期表示
// ================================
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

  // ✅ 初期値に「選択してください」を追加
  document.getElementById('category').innerHTML =
    `<option value="">選択してください</option>` +
    categories.map(c => `<option value="${c.categoryid}">${c.categoryname}</option>`).join('');

  document.getElementById('payer').innerHTML =
    `<option value="">選択してください</option>` +
    payers.map(p => `<option value="${p.payerid}">${p.payername}</option>`).join('');

  renderKakeiList('#kakeiTable tbody', variable, formatNum);
  renderKakeiList('#koteiTable tbody', fixed, formatNum);
  renderBurdenTable(burden);
  renderTotalTable(total);
}

// ================================
// 月切り替え処理
// ================================
document.getElementById('prevMonth').addEventListener('click', async () => {
  monthInput.value = changeMonth(monthInput.value, -1);
  await initDisplay();
});
document.getElementById('nextMonth').addEventListener('click', async () => {
  monthInput.value = changeMonth(monthInput.value, 1);
  await initDisplay();
});
monthInput.addEventListener('change', async () => await initDisplay());

// ================================
// 登録 or 更新処理
// ================================
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
    if (window.editTarget) {
      const { date: oldDate, seq } = window.editTarget;
      await updateKakei(oldDate, seq, row);
      msg.textContent = '更新しました。';
      window.editTarget = null;
    } else {
      delete row.seq;
      await insertKakei(row);
      msg.textContent = '登録しました。';
    }

    //  登録・更新後：年月は保持したままフォームのみ初期化
    const keepMonth = monthInput.value; // 現在の年月を保持
    form.reset();
    document.getElementById('datemonth').value = keepMonth; // 年月を復元
    document.getElementById('datepicker').value = row.date; // 入力日も保持
    await initDisplay();



  } catch (err) {
    console.error(err);
    msg.textContent = 'エラー: ' + err.message;
  }
});

// ================================
// クリアボタン処理
// ================================
document.getElementById('clearButton').addEventListener('click', async () => {
  form.reset();
  setToday('#datepicker', '#datemonth');
  msg.textContent = '';
  window.editTarget = null;
  await initDisplay();
});

// ================================
// 修正ボタン処理（変動費・固定費）
// ================================
async function handleEdit(selector) {
  const checked = document.querySelector(`${selector} tbody .row-check:checked`);
  if (!checked) return alert('修正する行を選択してください。');

  if (selector === '#koteiTable') {
    document.getElementById('fixedCost').checked = true;
  } else {
    document.getElementById('variableCost').checked = true;
  }

  await initDisplay();

  const selectedRow = {
    date: checked.dataset.date,
    seq: Number(checked.dataset.seq)
  };

  await editRow(selectedRow);
}

document.getElementById('editSelected').addEventListener('click', () => handleEdit('#kakeiTable'));
document.getElementById('koteieditSelected').addEventListener('click', () => handleEdit('#koteiTable'));

// ================================
// 削除ボタン処理（変動費・固定費）
// ================================
async function handleDelete(selector) {
  const checkedList = document.querySelectorAll(`${selector} tbody .row-check:checked`);
  if (checkedList.length === 0) return alert('削除する行を選択してください。');
  if (!confirm(`${checkedList.length}件を削除しますか？`)) return;

  try {
    for (const chk of checkedList) {
      const date = chk.dataset.date;
      const seq = Number(chk.dataset.seq);
      await deleteKakei(date, seq);
    }
    msg.textContent = '削除しました。';

    // ✅ 削除後フォームも初期化
    const keepMonth = monthInput.value;
    form.reset();
    document.getElementById('datemonth').value = keepMonth;
    await initDisplay();

  } catch (err) {
    console.error(err);
    alert('削除中にエラーが発生しました: ' + err.message);
  }
}

document.getElementById('deleteSelected').addEventListener('click', () => handleDelete('#kakeiTable'));
document.getElementById('koteideleteSelected').addEventListener('click', () => handleDelete('#koteiTable'));
