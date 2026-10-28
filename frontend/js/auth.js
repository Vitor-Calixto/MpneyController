function showError(message) {
  const el = document.getElementById('error-msg');
  el.textContent = message;
  el.style.display = 'block';
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const data = await FF.api('/auth/login', { method: 'POST', body: { email, password } });
    FF.setSession(data.token, data.user);
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await FF.api('/auth/register', { method: 'POST', body: { name, email, password } });
    const data = await FF.api('/auth/login', { method: 'POST', body: { email, password } });
    FF.setSession(data.token, data.user);
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.message);
  }
}
