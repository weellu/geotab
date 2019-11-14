function ConfigStore() {
  this.__defineGetter__('numOfTopSites', function() {
    var storedValue = localStorage.getItem('numOfTopSites');

    if (storedValue == null) {
      return 10;
    } else {
      return storedValue;
    }
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
  if (str.length <= maxLength) {
    return str;
  } else {
    return str.substring(0, maxLength - 2) + '..';
  }
}

function createElLink(id, url, text, title) {
  var img = document.createElement('img');
  img.src = 'chrome://favicon/' + url;

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
      title: "Geotab links (Links show in 'Geocaching New Tab-page')"
    },
    function(obj) {
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

window.onload = function() {
  setTimeout(renderFooterLinks, 10);

  $('toggleSettings').addEventListener('click', function() {
    toggleSettings();
  });

  $('numOfTopSitesToShow').addEventListener('change', function() {
    saveSettings();
  });

  document.getElementById('numOfTopSitesToShow').value = Config.numOfTopSites;

  verifyThatBookmarksFolderExists();

  document.getElementById('logcache').addEventListener('click', logGeocache);
};

function logGeocache() {
  window.open(
    'https://www.geocaching.com/seek/log.aspx?wp=' +
      document.getElementById('geocaching').value,
    '_blank'
  );
}
