const socket = io('http://localhost:4000');
const repId = getLoggedInRepId(); // from your rep auth session

let activeConversationId = null;

socket.emit('joinRepDashboard');
loadConversations();

async function loadConversations() {
  const res = await fetch('/api/conversations');
  const conversations = await res.json();
  const listEl = document.getElementById('convo-list');
  listEl.innerHTML = '';
  conversations.forEach(c => {
    const item = document.createElement('div');
    item.className = 'convo-item';
    item.textContent = c.customerId?.name || 'Customer';
    item.addEventListener('click', () => openConversation(c._id));
    listEl.appendChild(item);
  });
}

async function openConversation(id) {
  activeConversationId = id;
  socket.emit('joinConversation', id);

  const res = await fetch(`/api/conversations/${id}/messages`);
  const messages = await res.json();
  const messagesEl = document.getElementById('convo-messages');
  messagesEl.innerHTML = '';
  messages.forEach(renderMessage);
}

function renderMessage(msg) {
  const div = document.createElement('div');
  div.textContent = `${msg.senderType}: ${msg.text}`;
  document.getElementById('convo-messages').appendChild(div);
}

document.getElementById('convo-send').addEventListener('click', reply);
document.getElementById('convo-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') reply();
});

function reply() {
  const input = document.getElementById('convo-input');
  const text = input.value.trim();
  if (!text || !activeConversationId) return;
  socket.emit('sendMessage', { conversationId: activeConversationId, senderId: repId, senderType: 'rep', text });
  input.value = '';
}

socket.on('newMessage', (msg) => {
  if (msg.conversationId === activeConversationId) renderMessage(msg);
});

socket.on('newCustomerMessage', () => loadConversations());

function getLoggedInRepId() {
  return document.body.dataset.repId;
}