function ConfigStore() {
  this.__defineGetter__('numOfTopSites', function() {
    var storedValue = localStorage.getItem('numOfTopSites');
    return storedValue == null ? 10 : storedValue;
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
    localStorage.removeItem(key);
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
    ObjectStore.set(this.storageKey, links);
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
  return str.length <= maxLength ? str : str.substring(0, maxLength - 2) + '..';
}

function createElLink(id, url, text, title) {
  var img = document.createElement('img');
  img.src = 'http://www.google.com/s2/favicons?domain=' + url;

  var textNode = document.createTextNode(trimString(text, 20));

  var a = document.createElement('a');
  a.id = id;
  a.href = url;
  a.title = title;

  a.appendChild(img);
  a.appendChild(textNode);

  return a;
}

function addLinkToFooter(id, url, text, title) {
  document.getElementById('footer').appendChild(createElLink(id, url, text, title));
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
  const bookmarkFolderId = ObjectStore.get('bookmarkFolderId');

  if (bookmarkFolderId) {
    chrome.bookmarks.getChildren(bookmarkFolderId, function(bookmarks) {
      if (!bookmarks || chrome.runtime.lastError) {
        ObjectStore.clear('bookmarkFolderId');
        verifyThatBookmarksFolderExists(renderLinksFromBookmarks);
      } else {
        for (var i = 0; i < bookmarks.length; i++) {
          var bookmark = bookmarks[i];
          if (bookmark.url) {
            addLinkToFooter(
              bookmark.id,
              bookmark.url,
              bookmark.title,
              bookmark.title
            );
          }
        }
      }
    });
  } else {
    verifyThatBookmarksFolderExists(renderLinksFromBookmarks);
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

  if (chrome.topSites) {
    chrome.topSites.get(renderTopSites);
  }
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

function verifyThatBookmarksFolderExists(callback) {
  const folderTitle = "Geotab links (Links show in 'Geocaching New Tab-page')";

  chrome.bookmarks.search({ title: folderTitle }, function(results) {
    if (results && results.length > 0) {
      for (let i = 0; i < results.length; i++) {
        if (!results[i].url) {
          ObjectStore.set('bookmarkFolderId', results[i].id);
          if (callback) callback(results[i].id);
          return;
        }
      }
    }

    // Not found — create new
    chrome.bookmarks.create({ title: folderTitle }, function(newFolder) {
      ObjectStore.set('bookmarkFolderId', newFolder.id);
      if (callback) callback(newFolder.id);
    });
  });
}

function saveSettings() {
  var numOfTopSitesToShow = document.getElementById('numOfTopSitesToShow').value;
  Config.numOfTopSites = numOfTopSitesToShow;
  renderFooterLinks();
}

window.onload = function() {
  setTimeout(renderFooterLinks, 10);

  const toggleSettingsBtn = document.getElementById('toggleSettings');
  if (toggleSettingsBtn) {
      toggleSettingsBtn.addEventListener('click', toggleSettings);
  }

  $('numOfTopSitesToShow').addEventListener('change', function() {
    saveSettings();
  });

  document.getElementById('numOfTopSitesToShow').value = Config.numOfTopSites;

  verifyThatBookmarksFolderExists();

  document.getElementById('logcache').addEventListener('click', logGeocache);

  document.getElementById('wiktionaryinput').addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
      openWiktionary();
    }
  });
};

function logGeocache() {
  window.open(
    'https://www.geocaching.com/seek/log.aspx?wp=' +
      document.getElementById('geocaching').value,
    '_blank'
  );
}

function openWiktionary() {
  window.open(
    'https://fi.wiktionary.org/wiki/' +
      document.getElementById('wiktionaryinput').value,
    '_self'
  );
}
