if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace('https:' + location.href.substring(location.protocol.length));
}

const firebaseConfig = {
  apiKey: "AIzaSyDYJUsJLWkSjHZuiKJ23XMyy7zNqDI5JPc",
  authDomain: "learn-italian-iqra.firebaseapp.com",
  projectId: "learn-italian-iqra",
  storageBucket: "learn-italian-iqra.firebasestorage.app",
  messagingSenderId: "351401409834",
  appId: "1:351401409834:web:adaa278b93637e9d197253"
};
