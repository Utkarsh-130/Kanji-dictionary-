
importScripts('config.js');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Kanji Learning Extension installed');
  
  chrome.storage.sync.set({
    activeDatasets: ['n5'],
    extensionEnabled: false 
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CHECK_AUTH':
      checkAuthentication().then(sendResponse);
      return true;
      
    case 'AUTHENTICATE':
      authenticate(request.email, request.password).then(sendResponse);
      return true;
      
    case 'SIGN_UP':
      signUp(request.email, request.password).then(sendResponse);
      return true;
      
    case 'SIGN_OUT':
      signOut().then(sendResponse);
      return true;
      
    case 'SAVE_KANJI_STUDY':
      saveKanjiStudy(request.data).then(sendResponse);
      return true;
      
    case 'GET_STUDIED_KANJI':
      getStudiedKanji().then(sendResponse);
      return true;
  }
});

async function checkAuthentication() {
  try {
    const session = await supabase.getSession();
    const isAuthenticated = !!session?.access_token;
    
    await chrome.storage.sync.set({ extensionEnabled: isAuthenticated });
    
    return {
      isAuthenticated,
      user: session?.user || null
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      user: null,
      error: error.message
    };
  }
}

async function authenticate(email, password) {
  try {
    const { data, error } = await supabase.signIn(email, password);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    await chrome.storage.sync.set({ extensionEnabled: true });
    
    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function signUp(email, password) {
  try {
    const { data, error } = await supabase.signUp(email, password);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      message: 'Please check your email to verify your account!'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function signOut() {
  try {
    await supabase.signOut();
    await chrome.storage.sync.set({ extensionEnabled: false });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function saveKanjiStudy(data) {
  try {
    const success = await supabase.insertKanjiStudy(
      data.kanji,
      data.meaning,
      data.reading,
      data.level
    );
    
    return { success };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getStudiedKanji() {
  try {
    const kanji = await supabase.getStudiedKanji();
    return { success: true, data: kanji };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateBadge() {
  const result = await checkAuthentication();
  if (result.isAuthenticated) {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  }
}
updateBadge();
setInterval(updateBadge, 60000); 
