function ConfigStore() {
  this.__defineGetter__('numOfTopSites', function() {
    var storedValue = localStorage.getItem('numOfTopSites');

    if (storedValue == null) return 10;
    else return storedValue;
  });

  this.__defineSetter__('numOfTopSites', function(val) {
    localStorage.setItem('numOfTopSites', val);
  });
}

var Config = new ConfigStore();

var ObjectStore = {
  get: function(key) {
    return JSON.parse(localStorage.getItem(key));
  },

  set: function(key, object) {
    localStorage.setItem(key, JSON.stringify(object));
  },

  clear: function(key) {
    localStorage.clear(key);
  }
};

var LinkStore = {
  storageKey: 'linkStore',

  add: function(url, text, title) {
    var newLink = {
      id: createGuid(),
      url: url,
      text: text,
      title: title
    };

    var links = this.getAll();
    links.push(newLink);

    ObjectStore.set(this.storageKey, links);
  },

  remove: function(id) {
    var links = this.getAll();

    for (var i = 0; i < links.length; i++) {
      if (links[i].id == id) {
        links.splice(i, 1);
        break;
      }
    }
  },

  getAll: function() {
    var links = ObjectStore.get(this.storageKey);

    return links == null ? [] : links;
  }
};

function createGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function $(id) {
  return document.getElementById(id);
}

function trimString(str, maxLength) {
  if (str.length <= maxLength) return str;
  else return str.substring(0, maxLength - 2) + '..';
}

function createElLink(id, url, text, title) {
  var img = document.createElement('img');
  img.src = 'http://www.google.com/s2/favicons?domain=' + url;

  var text = document.createTextNode(trimString(text, 20));

  var a = document.createElement('a');
  a.id = id;
  a.href = url;
  a.title = title;

  a.appendChild(img);
  a.appendChild(text);

  return a;
}

function addLinkToFooter(id, url, text, title) {
  document
    .getElementById('footer')
    .appendChild(createElLink(id, url, text, title));
}

function grow(el) {
  el.classList.add('tall');
}

function renderTopSites(topSites) {

  for (var i = 0; i < Config.numOfTopSites && i < topSites.length; i++) {
    var topSite = topSites[i];
    addLinkToFooter('topsite-' + i, topSite.url, topSite.title, topSite.title);
  }
}

function renderLinksFromBookmarks() {
  var bookmarkFolder = ObjectStore.get('bookmarkFolder');

  if (bookmarkFolder != null) {
    chrome.bookmarks.getChildren(bookmarkFolder.id, function(bookmarks) {
      console.log(bookmarks);

      for (var i = 0; i < bookmarks.length; i++) {
        var bookmark = bookmarks[i];

        addLinkToFooter(
          bookmark.id,
          bookmark.url,
          bookmark.title,
          bookmark.title
        );
      }
    });
  }
}

function removeAllChildren(el) {
  while (el.lastChild) {
    el.removeChild(el.lastChild);
  }
}

function renderFooterLinks() {
  removeAllChildren(document.getElementById('footer'));

  renderLinksFromBookmarks();

  if (chrome.topSites) chrome.topSites.get(renderTopSites);
}

function addLink() {
  var url = $('newLinkUrl').value;
  var text = $('newLinkText').value;

  LinkStore.add(url, text, text);
}

function showLinkConfig() {
  document.getElementById('footer').style.display = 'none';
  document.getElementById('linkConfig').style.display = 'block';

  var links = LinkStore.getAll();

  for (var i = 0; i < links.length; i++) {
    addLinkToConfig(links[i].id, links[i].url, links[i].text, links[i].text);
  }
}

function toggleSettings() {
  var current = document.getElementById('settings').style.display;

  if (current == '' || current == 'none') {
    document.getElementById('settings').style.display = 'inline-block';
    document.getElementById('settingsContainer').className = 'settingsShow';
  } else {
    document.getElementById('settings').style.display = 'none';
    document.getElementById('settingsContainer').className = '';
  }
}

function verifyThatBookmarksFolderExists() {
  var bookmarkFolder = ObjectStore.get('bookmarkFolder');

  if (bookmarkFolder == null) {
    createBookmarkFolder();
  } else {
    chrome.bookmarks.getChildren(bookmarkFolder.id, function(bookmarks) {
      if (bookmarks == undefined) {
        ObjectStore.clear('bookmarkFolder');
        createBookmarkFolder();
      }
    });
  }
}

function createBookmarkFolder() {
  chrome.bookmarks.create(
    {
      title: "Newtab links (Links show in 'VS New Tab-page')"
    },
    function(obj) {
      console.debug('Bookmark folder created');
      console.debug(obj);

      ObjectStore.set('bookmarkFolder', obj);
    }
  );
}

function saveSettings() {
  var numOfTopSitesToShow = document.getElementById('numOfTopSitesToShow')
    .value;

  Config.numOfTopSites = numOfTopSitesToShow;

  renderFooterLinks();
}

function insertHelpElement() {
  var bookmarkFolder = ObjectStore.get('bookmarkFolder');

  // 500 is a random number
  //
  // bookmarkFolder might not be created yet (on the first load)
  if (bookmarkFolder == null) setTimeout(insertHelpElement, 500);

  var parent = $('settings');

  var span = document.createElement('span');
  span.title =
    "Copy paste the URL OR open the Bookmark Manager with Ctrl+Shift+O and look for the 'Newtab links' folder.";
  span.textContent =
    'Show custom links from chrome://bookmarks/#' + bookmarkFolder.id + ' and ';

  parent.insertBefore(span, parent.children[0]);
}

window.onload = function() {
  // 10 is a random number, 0 seemed to work as well
  // apparently if renderFooterLinks() is called directly,
  // something is not ready and topsites are not rendered
  setTimeout(renderFooterLinks, 10);

  document.getElementById('toggleSettings').addEventListener('click', function() {
    toggleSettings();
  });

  $('numOfTopSitesToShow').addEventListener('change', function() {
    saveSettings();
  });

  document.getElementById('numOfTopSitesToShow').value = Config.numOfTopSites;

  verifyThatBookmarksFolderExists();
};
