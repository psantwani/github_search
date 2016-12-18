chrome.extension.onMessage.addListener(
	function(request, sender, sendResponse) {
		chrome.pageAction.show(sender.tab.id);
		sendResponse();
	});

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details){
	console.log(details);
	if(details.frameId === 0) {
		chrome.tabs.get(details.tabId, function(tab) {
			console.log(tab.status)
			if(tab.url === details.url) {
				console.log("onHistoryStateUpdated");                
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					ensureSendMessage(tabs[0].id, {command: "onHistoryStateUpdated"});
				});
			}
		});
	}
});


function ensureSendMessage(tabId, message, callback){
	chrome.tabs.sendMessage(tabId, message, function(response){
		if(response) { 
			if(response.pong){chrome.tabs.sendMessage(tabId, message, callback);}      
		} else {
			chrome.tabs.executeScript(tabId, {file: "inject.js"}, function(){
				if(chrome.runtime.lastError) {
					console.error(chrome.runtime.lastError);
					throw Error("Unable to inject script into tab " + tabId);
				}        
				chrome.tabs.sendMessage(tabId, message, callback);
			});
		}
	});
}