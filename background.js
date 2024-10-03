// 默认设置，开关初始为开启状态
const defaultSettings = {
    isEnabled: false
};

// 初始化设置
chrome.storage.sync.get(['isEnabled'], (result) => {
    if (result.isEnabled === undefined) {
        // 如果没有设置，使用默认值
        chrome.storage.sync.set(defaultSettings);
    }
});


// 创建上下文菜单项以切换开关
chrome.contextMenus.create({
    id: "toggleSwitch",
    title: "Toggle Media Interception",
    contexts: ["action"]
});

// 监听菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "toggleSwitch") {
        chrome.storage.sync.get(['isEnabled'], (result) => {
            const newValue = !result.isEnabled; // 切换状态
            chrome.storage.sync.set({isEnabled: newValue}, () => {
                const message = newValue ? "Media interception enabled." : "Media interception disabled.";
                console.log(message); // 可选：在控制台输出消息
            });
        });
    }
});
//转发方案：
// 监听请求
chrome.webRequest.onBeforeRequest.addListener(
    async function (details) {
        const result = await new Promise(resolve => chrome.storage.sync.get(['isEnabled'], resolve));
        const isEnabled = result.isEnabled;

        if (isEnabled) {
            const url = details.url;
            const mediaFilePattern = /\.(mp4|m3u8|webm|flv|ts)(\?.*)?$/;

            if (mediaFilePattern.test(url)) {
                console.log("Media URL:", url);
                try {
                    const response = await fetch(details.url);
                    if (!response.ok) {
                        console.error(`Network response was not ok: ${response.statusText}`);
                        return { cancel: false }; // 继续处理请求
                    }

                    const data = await response.arrayBuffer();
                    const saveResponse = await fetch('http://localhost:12345/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'x-filename-url': url
                        },
                        body: data
                    });

                    console.log(await saveResponse.text());
                } catch (error) {
                    console.error('Error fetching media:', error);
                }
            }
        }
        return { cancel: false }; // 继续处理请求
    },
    { urls: ["<all_urls>"] }
);



function sendNativeMessage(message) {
    chrome.runtime.sendNativeMessage('com.example.nativeapp', message, function (response) {
        console.log('Native app response:', response);
    });
}


function downloadMediaFile(url) {
    const fileName = getFileNameFromUrl(url);

    // Use Chrome download API to download the media file
    chrome.downloads.download({
        url: url,
        filename: "downloaded_media/" + fileName,
        saveAs: false,  // 不弹出保存对话框
        conflictAction: "uniquify"  // 如果文件名冲突，自动重命名
    }, function (downloadId) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        } else {
            console.log("Download started with ID:", downloadId, "url:", url);
        }
    });
}

// 函数：下载 M3U8 文件并保留目录结构
async function saveM3U8File(url, content) {
    const urlObject = new URL(url);
    const host = urlObject.host;
    // 提取文件名
    const fileName = url.split('/').pop();
    // 构建路径，包含主机作为根目录
    const dirPath = host + urlObject.pathname.replace(fileName, '');

    // 构造完整保存路径，保留目录结构
    const filePath = dirPath + fileName;

    // 检查文件是否存在
    const existingFile = await checkIfFileExists(filePath);

    if (existingFile) {
        console.log('File exists. Appending content...');
        appendToFile(filePath, content);
    } else {
        console.log('File does not exist. Creating new file...');
        downloadFile(filePath, content);
    }
}

// 函数：检查文件是否存在
function checkIfFileExists(filePath) {
    return new Promise((resolve, reject) => {
        chrome.downloads.search({filenameRegex: filePath}, (results) => {
            if (results && results.length > 0) {
                resolve(true); // 文件存在
            } else {
                resolve(false); // 文件不存在
            }
        });
    });
}

// 函数：追加内容到文件（由于直接访问文件系统的限制，这部分可以通过提示用户操作）
function appendToFile(filePath, content) {
    chrome.downloads.download({
        url: 'data:text/plain;base64,' + btoa(content),
        filename: filePath,
        saveAs: true // 提示用户覆盖或者追加
    }, function (downloadId) {
        if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
        } else {
            console.log('Appended to file with ID:', downloadId);
        }
    });
}

// 函数：下载新文件
function downloadFile(filePath, content) {
    chrome.downloads.download({
        url: 'data:text/plain;base64,' + btoa(content),
        filename: filePath,
        saveAs: true // 直接保存，不提示用户
    }, function (downloadId) {
        if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
        } else {
            console.log('New file saved with ID:', downloadId);
        }
    });
}


function getFileNameFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.pathname.split("/").pop();
}

// 函数：移除URL的主机和参数部分
function removeHostAndParams(url) {
    // 匹配协议和主机部分，移除协议://host 和 ?参数部分
    const cleanedUrl = url.replace(/^https?:\/\/[^\/]+/, '').split('?')[0];
    return cleanedUrl;
}