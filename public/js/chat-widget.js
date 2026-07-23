const socket = io('http://localhost:4000'); // point this to your deployed server later

// TODO: replace with the real logged-in customer's ID from your auth/session
const customerId = getLoggedInCustomerId();

let conversationId = null;

const bubble = document.getElementById('aurelius-chat-bubble');
const chatWindow = document.getElementById('aurelius-chat-window');
const closeBtn = document.getElementById('aurelius-chat-close');
const messagesEl = document.getElementById('aurelius-chat-messages');
const input = document.getElementById('aurelius-chat-input');
const sendBtn = document.getElementById('aurelius-chat-send');

bubble.addEventListener('click', async () => {
  chatWindow.classList.remove('hidden');
  if (!conversationId) await initConversation();
});

closeBtn.addEventListener('click', () => {
  chatWindow.classList.add('hidden');
});

async function initConversation() {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId })
  });
  const convo = await res.json();
  conversationId = convo._id;

  socket.emit('joinConversation', conversationId);

  const historyRes = await fetch(`/api/conversations/${conversationId}/messages`);
  const history = await historyRes.json();
  history.forEach(renderMessage);
}

function renderMessage(msg) {
  const div = document.createElement('div');
  div.className = msg.senderType === 'customer' ? 'msg-mine' : 'msg-theirs';
  div.textContent = msg.text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendMessage() {
  const text = input.value.trim();
  if (!text || !conversationId) return;
  socket.emit('sendMessage', { conversationId, senderId: customerId, senderType: 'customer', text });
  input.value = '';
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

socket.on('newMessage', (msg) => {
  if (msg.conversationId === conversationId) renderMessage(msg);
});

function getLoggedInCustomerId() {
  // Replace with however Aurelius currently tracks logged-in users
  // e.g. read from a cookie, localStorage token payload, or a data attribute on <body>
  return document.body.dataset.customerId;
}