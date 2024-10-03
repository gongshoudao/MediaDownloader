document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggleSwitch');

    // 获取存储的状态并更新 UI
    chrome.storage.sync.get(['isEnabled'], (result) => {
        toggleSwitch.checked = result.isEnabled !== undefined ? result.isEnabled : true; // 默认启用
        console.log('Current toggle state:', toggleSwitch.checked);
    });

    // 监听开关状态变化
    toggleSwitch.addEventListener('change', () => {
        const newValue = toggleSwitch.checked;
        chrome.storage.sync.set({ isEnabled: newValue }, () => {
            const message = newValue ? "Media interception enabled." : "Media interception disabled.";
            console.log(message); // 可选：在控制台输出消息
        });
    });
});
