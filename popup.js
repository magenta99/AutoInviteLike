let invitedCountGlobal = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INVITE_COUNT_UPDATE') {
    invitedCountGlobal = message.count;
    console.log(`[POPUP] Đã mời: ${invitedCountGlobal}`);
    document.getElementById('inviteCountValue').innerText = invitedCountGlobal;
  }
});

document.getElementById('startBtn').addEventListener('click', async () => {
  document.getElementById('statusText').innerText = 'Đang chạy...';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const sendInviteUpdate = (count) => {
        chrome.runtime.sendMessage({ type: 'INVITE_COUNT_UPDATE', count });
        console.log(`[INJECTED] Đã mời: ${count}`);
      };

      (async function autoDetectScrollAndInvite() {
        const delay = ms => new Promise(res => setTimeout(res, ms));
        const MAX_INVITES = 200;
        const CLICK_DELAY = 2500;
        const SCROLL_DELAY = 2000;
        let invitedCount = 0;
        let lastScrollTop = -1;
        let stuckCount = 0;

        function findScrollableContainer() {
          const candidates = document.querySelectorAll('div[role="dialog"] div');
          for (const el of candidates) {
            const style = window.getComputedStyle(el);
            const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
            const hasInviteButton = Array.from(el.querySelectorAll('div[role="button"]')).some(btn => btn.innerText.trim() === 'Mời');
            if (canScrollY && hasInviteButton) return el;
          }
          return null;
        }

        const scrollContainer = findScrollableContainer();
        if (!scrollContainer) {
          alert("❌ Không tìm thấy container scroll chứa nút Mời");
          return;
        }

        while (invitedCount < MAX_INVITES && stuckCount < 10) {
          const buttons = Array.from(document.querySelectorAll('div[role="button"]'))
            .filter(btn => btn.innerText.trim() === 'Mời');

          for (const btn of buttons) {
            if (invitedCount >= MAX_INVITES) break;
            try {
              btn.click();
              invitedCount++;
              sendInviteUpdate(invitedCount);
              await delay(CLICK_DELAY + Math.random() * 1000);
            } catch (err) {
              console.warn("⚠️ Không click được nút:", err);
            }
          }

          scrollContainer.scrollBy(0, 600);
          await delay(SCROLL_DELAY);

          if (scrollContainer.scrollTop === lastScrollTop) {
            stuckCount++;
          } else {
            lastScrollTop = scrollContainer.scrollTop;
            stuckCount = 0;
          }
        }

        if (invitedCount >= MAX_INVITES) {
          alert("🚫 Đã mời đủ 200 người. Nghỉ 30 phút rồi chạy tiếp.");
        } else {
          alert(`🎉 Mời xong ${invitedCount} người.`);
        }
      })();
    }
  });
});