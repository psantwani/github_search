chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
		if (document.readyState === "complete") {
			clearInterval(readyStateCheckInterval);		
		//chrome.storage.local.clear();		
		chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) { 
			if(request.command === "onHistoryStateUpdated") { 
				init();  	  	 
				sendResponse({pong:true});
				return true; 
			}  
		});			

		init();
	}
}, 10);
});


function init(){
	
	if($(".repohead-details-container")[0]){
		insertSearchBox();
	}
	else{
		//console.log("not the target page.")
	}
}

function insertSearchBox(){
	var searchBox = 
	"<div id='github_search_box_widget'>" +	
	"<input class='github_search_box' placeholder = 'Search... Type / for root folder' >" +
	"<input type = 'button' value = 'Download' id='github_search_raw_button'>" +
	"</div>";

	if($("#github_search_box_widget")[0]){
  		//console.log("search box already created");	
  	}
  	else{
  		$(".file-navigation").append(searchBox);
  		
  		getUserRepoAndBranchNames(function(names){
  			getFromLocalStorage(names, function(getData){
  				if(getData){
  					listFilesApi(names.user, names.repo, names.branch);
  				}
  			});  			
  		});  		
  	}
  }

  function getUserRepoAndBranchNames(cb){
  	var userElement = $(".author")[0];
  	var user = userElement.children[0].innerHTML;
  	var repoElement = $(userElement).next().next()[0];
  	var repo = repoElement.children[0].innerHTML;
  	var branchElement = $(".branch-select-menu > button > span")[0];
  	var branch = branchElement.innerHTML;

  	setDomProperties(user, repo, branch);

  	return cb({
  		user : user,
  		repo : repo,
  		branch : branch
  	});
  }

  function listFilesApi(username, repo, branch){	
  	$.ajax({
  		url : "https://api.github.com/repos/" + username + "/" + repo + "/git/trees/" + branch + "?recursive=1",
  		success : function(result){
  			saveToLocalStorage(username, repo, branch, result.tree);
  		},
  		error : function(err){
			//console.log(err);
		}
	})
  }


  function saveToLocalStorage(username, repo, branch, data){
  	var result = [];
  	var numberOfCommits = 0 
  	if($(".commits > a > span")[0]){
  		numberOfCommits = $(".commits > a > span")[0].innerText.trim();
  	}	

  	result.push({
  		name : "/",
  		path : "https://github.com/" + username + "/" + repo,
  		size : "folder"
  	});

  	data.map(function(item){
  		var size;
  		
  		if(item.size && item.type === "blob"){
  			size = (item.size*0.001).toFixed(2) + "KB";
  		}
  		else if (item.type === "blob"){
  			size = "0KB"
  		}
  		else if (item.type === "tree"){
  			size = "folder"
  		}

  		result.push({
  			name : item.path.split("/")[item.path.split("/").length - 1],
  			path : item.path,
  			size : size		
  		});
  	});
  	
  	var setItemObj = {};
  	var key = username + "." + repo + "." + branch;
  	setItemObj[key] = {};
  	setItemObj[key]["data"] = result;
  	setItemObj[key]["commits"] = numberOfCommits;	
  	
  	chrome.storage.local.set(setItemObj);
  	setAutocompleteForSearchBox(username, repo, branch, setItemObj[key]["data"]);
  }

  function getFromLocalStorage(keyObj, cb){
  	var key = keyObj.user + "." + keyObj.repo + "." + keyObj.branch;
  	var numberOfCommits = 0;
  	
  	if($(".commits > a > span")[0]){
  		numberOfCommits = $(".commits > a > span")[0].innerText.trim();
  	}		

  	chrome.storage.local.get(key, function(data){		
  		if(jQuery.isEmptyObject(data)){
  			return cb(true);
  		}
  		else{
  			if(parseInt(numberOfCommits) !== 0 && data[key]["commits"] !== numberOfCommits){
  				return cb(true);
  			}
  			else{
  				setAutocompleteForSearchBox(keyObj.user, keyObj.repo, keyObj.branch, data[key]["data"]);
  				return cb(false);
  			}			
  		}			
  	});
  }

  function setAutocompleteForSearchBox(username, repo, branch, data){
  	var id = username + "." + repo + "." + branch;
  	var domId = id.replace(/\./g , "");
  	$(".github_search_box")[0].id = domId;
  	
  	var options = {
  		data: data,
  		getValue: "name",
  		highlightPhrase: false,
  		list: {
  			maxNumberOfElements: 10,
  			match: {
  				enabled: true
  			},

  			showAnimation: {
  				type: "fade",
  				time: 400,
  				callback: function() {					
  				}
  			},

  			hideAnimation: {
  				type: "slide",
  				time: 400,
  				callback: function() {
  					userAction(username, repo, branch);
  				}
  			},			
  		},
  		template: {
  			type : "custom",
  			method : function(value, item){
  				return "<span class = 'github_search_item_name'>" + value + "</span>" + "<span class = 'github_search_item'><span class = 'github_search_item_path'>" + item.path + "</span> | <span class = 'github_search_item_size'>" + item.size + "</span></span>"; 
  			}		
  		}
  	};

  	$("#" + domId).easyAutocomplete(options);	
  	$("#github_search_box_widget").css("display", "block");
  	
  }

  function setDomProperties(user, repo, branch){
  	var url = location.href;
  	var searchStr = "https://github.com/" + user + "/" + repo + "/blob/" + branch + "/";
  	if(url.indexOf(searchStr) > -1){		
  		$(".github_search_box")[0].placeholder = url.split(searchStr)[1];
  	}

  	$("#github_search_raw_button").click(function(){			
  		if(url.indexOf(searchStr) > -1){
  			saveFile("https://raw.githubusercontent.com/" + user + "/" + repo + "/" + branch + "/" + url.split(searchStr)[1]);
  		}
  		else{
  			$(".github_search_box")[0].placeholder = "Search for the file, then download."
  		}		
  	});
  }

  function userAction(username, repo, branch){
  	
  	var selected = $('.easy-autocomplete-container ul li.selected')[0];	
  	if(selected){
  		var name = $(selected).find(".github_search_item_name")[0].innerHTML;
  		var path = $(selected).find(".github_search_item_path")[0].innerHTML;
  		var size = $(selected).find(".github_search_item_size")[0].innerHTML;

  		if(name === "/"){
  			location.href = path;
  		}		
  		else if(size === "folder"){
  			location.href = "https://github.com/" + username + "/" + repo + "/" + "tree/" + branch + "/" + path;
  		}
  		else{			
  			location.href = "https://github.com/" + username + "/" + repo + "/" + "blob/" + branch + "/" + path;							
  		}

  	}
  	else{
		//console.log("no item selected");
	}
	
}


function saveFile(url) {
	var filename = url.substring(url.lastIndexOf("/") + 1).split("?")[0];
	var xhr = new XMLHttpRequest();
	xhr.responseType = 'blob';
	xhr.onload = function() {
		var a = document.createElement('a');
		a.href = window.URL.createObjectURL(xhr.response);
		a.download = filename;
		a.style.display = 'none';
		document.body.appendChild(a);
		a.click();
		delete a;
	};
	xhr.open('GET', url);
	xhr.send();
}