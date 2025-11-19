import {
      loadCategories, loadPayers, loadBurdenTable, loadTotalTable, loadKakeiTable, editRow,
      insertKakei, updateKakei, deleteKakei, getNextSeq, changeMonth,
      formatNum, calcTotal, setToday, renderKakeiList, renderBurdenTable, renderTotalTable,ensureMonthlySettled 
    } from '../js/common.js';

    const msg = document.getElementById('message');
    const monthInput = document.getElementById('datemonth');
    const categorySelect = document.getElementById('categorySelect');
    const payerSelect = document.getElementById('payerSelect');
    const toggleButtons = document.querySelectorAll('.cost-toggle button');
    let currentType = 'variable';

    // ▼ コストタイプ切替
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        toggleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
        await renderCategories();
      });
    });

    // ▼ カテゴリ・支払者読込
    async function renderCategories() {
      const cats = await loadCategories(currentType === 'fixed');
      categorySelect.innerHTML = '<option value="">選択してください</option>';
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.categoryid;
        opt.textContent = c.categoryname;
        categorySelect.appendChild(opt);
      });
    }
    async function renderPayers() {
      const data = await loadPayers();
      payerSelect.innerHTML = '<option value="">選択してください</option>';
      data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.payerid;
        opt.textContent = p.payername;
        payerSelect.appendChild(opt);
      });
    }

    // ▼ 家計簿一覧
    async function refreshTables() {
      const month = monthInput.value;
      const varData = await loadKakeiTable(false, month);
      const fixData = await loadKakeiTable(true, month);
      renderKakeiList('#fixedTable tbody', fixData, formatNum);
      renderKakeiList('#variableTable tbody', varData, formatNum);
    }

   //  ▼ 個人負担表
   async function refreshBurdenTable() {
      const burden = await loadBurdenTable(monthInput.value);
      renderBurdenTable(burden);
   }

   //  ▼ 合計表
   async function refreshTotalTable() {
      const total = await loadTotalTable(monthInput.value);
      renderTotalTable(total);
   }


    // ▼ 登録・更新
   document.getElementById('mobileForm').addEventListener('submit', async (e) => {
     e.preventDefault();
     msg.textContent = ''; // メッセージ初期化

     try {
       // ▼ 入力値取得
       const dateVal = document.getElementById('datepicker').value;
       const categoryVal = categorySelect.value;
       const noteVal = document.getElementById('noteInput').value.trim();

       const income = +document.getElementById('incomeInput').value || 0;
       const meal = +document.getElementById('mealInput').value || 0;
       const supplies = +document.getElementById('suppliesInput').value || 0;
       const play = +document.getElementById('playInput').value || 0;
       const infra = +document.getElementById('infraInput').value || 0;
       const education = +document.getElementById('educationInput').value || 0;
       const others = +document.getElementById('othersInput').value || 0;

       // ▼ バリデーションチェック
       if (!dateVal) {
         msg.textContent = '日付を入力してください。';
         return;
       }

       if (!categoryVal && !noteVal) {
         msg.textContent = 'カテゴリまたはテキストを入力してください。';
         return;
       }

       if (
         income === 0 &&
         meal === 0 &&
         supplies === 0 &&
         play === 0 &&
         infra === 0 &&
         education === 0 &&
         others === 0
       ) {
         msg.textContent = '金額を1つ以上入力してください。';
         return;
       }

       // ▼ 登録データ作成
       const row = {
         date: dateVal,
         categoryid: categoryVal,
         payerid: payerSelect.value,
         content: noteVal,
         income,
         meal,
         supplies,
         play,
         infra,
         education,
         others,
         fixedcostflg: currentType === 'fixed' ? 2 : 1,
       };

       // 合計計算（DBには送らない）
       const totalValue = calcTotal(row);
       row.seq = await getNextSeq(row.date);
       const { total, ...insertRow } = row;

       if (window.editTarget) {
         await updateKakei(window.editTarget.date, window.editTarget.seq, insertRow);
         msg.textContent = '更新しました。';
         window.editTarget = null;
       } else {
         await insertKakei(insertRow);
         msg.textContent = '登録しました。';
       }

       e.target.reset();
       
       // ▼ 登録後に今日の日付を再セット
       const now = new Date();
       const yyyy = now.getFullYear();
       const mm = String(now.getMonth() + 1).padStart(2, '0');
       const dd = String(now.getDate()).padStart(2, '0');
       document.getElementById('datepicker').value = `${yyyy}-${mm}-${dd}`;
       await refreshAllTables();

     } catch (err) {
       console.error('登録エラー:', err);
       msg.textContent = 'エラー: ' + err.message;
     }
   });

    // ▼ 選択行取得
    function getSelectedRows() {
      return Array.from(document.querySelectorAll('.row-check:checked')).map(chk => ({
        date: chk.dataset.date,
        seq: Number(chk.dataset.seq)
      }));
    }

// ▼ 固定費の編集
document.getElementById('editFixed').addEventListener('click', async () => {
  const selected = getSelectedRows('#fixedTable');
  if (selected.length !== 1) return alert('固定費の編集は1行のみ選択してください');
  
  // ✅ 固定費モードに切り替え
  currentType = 'fixed';
  document.querySelectorAll('.cost-toggle button').forEach(b => b.classList.remove('active'));
  const fixedBtn = document.querySelector('.cost-toggle button[data-type="fixed"]');
  if (fixedBtn) fixedBtn.classList.add('active');

  // ✅ カテゴリリストを固定費用に再読み込み
  await renderCategories();
  
  
  await editRow(selected[0]);
});

// ▼ 固定費の削除
document.getElementById('deleteFixed').addEventListener('click', async () => {
  const selected = getSelectedRows('#fixedTable');
  if (!selected.length) return alert('削除する固定費を選択してください');
  if (!confirm(`${selected.length} 件を削除しますか？`)) return;
  for (const row of selected) await deleteKakei(row.date, row.seq);
  msg.textContent = `${selected.length} 件削除しました（固定費）`;
  await refreshAllTables();
});

// ▼ 変動費の編集
document.getElementById('editVariable').addEventListener('click', async () => {
  const selected = getSelectedRows('#variableTable');
  if (selected.length !== 1) return alert('変動費の編集は1行のみ選択してください');
  await editRow(selected[0]);
});

// ▼ 変動費の削除
document.getElementById('deleteVariable').addEventListener('click', async () => {
  const selected = getSelectedRows('#variableTable');
  if (!selected.length) return alert('削除する変動費を選択してください');
  if (!confirm(`${selected.length} 件を削除しますか？`)) return;
  for (const row of selected) await deleteKakei(row.date, row.seq);
  msg.textContent = `${selected.length} 件削除しました（変動費）`;
  await refreshAllTables();
});

    // ▼ 月切替
    document.getElementById('prevMonth').addEventListener('click', async () => {
      monthInput.value = changeMonth(monthInput.value, -1);
      await refreshAllTables();
    });
    document.getElementById('nextMonth').addEventListener('click', async () => {
      monthInput.value = changeMonth(monthInput.value, 1);
      await refreshAllTables();
    });

   // ▼ 手入力でも反映
   document.getElementById('datemonth').addEventListener('change', async () => {
     await refreshAllTables();
   });

    // ▼ 初期化
    window.addEventListener('DOMContentLoaded', async () => {
      const dateInput = document.getElementById('datepicker');
      dateInput.addEventListener('focus', () => {
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
         return;
        }
        dateInput.type = 'date';
      });
     dateInput.addEventListener('blur', () => {
     dateInput.type = 'text';
   });
    
      setToday('#datepicker', '#datemonth');
      await renderCategories();
      await renderPayers();
      await refreshAllTables();
    });
    
    
    // ▼各表の更新
    async function refreshAllTables() {
      const month = document.getElementById('datemonth').value;
      await ensureMonthlySettled(month);
      await refreshTables();
      await refreshBurdenTable();
      await refreshTotalTable();
    }
    
     // アドレスバーを自動で隠す（スマホ用）
    window.addEventListener('load', () => {
      setTimeout(() => {
      window.scrollTo(0, 1);
      }, 100);
   });

   // ▼ クリアボタン処理
   document.getElementById('clearButton').addEventListener('click', () => {
     // 入力欄をすべてリセット
     document.getElementById('mobileForm').reset();

     // 今日の日付を再セット
     const now = new Date();
     const yyyy = now.getFullYear();
     const mm = String(now.getMonth() + 1).padStart(2, '0');
     const dd = String(now.getDate()).padStart(2, '0');
     document.getElementById('datepicker').value = `${yyyy}-${mm}-${dd}`;

     // メッセージをクリア
     document.getElementById('message').textContent = '';

     // コストタイプボタンも初期化
     document.querySelectorAll('.cost-toggle button').forEach(b => b.classList.remove('active'));
     document.querySelector('.cost-toggle button[data-type="variable"]').classList.add('active');
   });