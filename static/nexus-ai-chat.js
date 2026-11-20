(() => {
  const apiBase = document.querySelector('meta[name="synbai-api-base"]')?.content || 'https://api.fxsynbai.eu';
  const form = document.getElementById('nexusAiForm');
  const input = document.getElementById('nexusAiInput');
  const send = document.getElementById('nexusAiSend');
  const messagesNode = document.getElementById('nexusAiMessages');
  const statusNode = document.getElementById('nexusAiStatus');
  const planNode = document.getElementById('nexusAiPlan');
  const usageNode = document.getElementById('nexusAiUsage');
  if (!form || !input || !send || !messagesNode) return;

  const history = [];
  let usage = null;
  const number = value => new Intl.NumberFormat('en-US').format(value);
  const bubble = (role, text = '', continued = false) => {
    const node = document.createElement('div');
    node.className = `nexus-ai-message ${role}`;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? 'YOU' : continued ? 'NEXUS AI · CONTINUED' : 'NEXUS AI';
    const body = document.createElement('p');
    body.textContent = text;
    node.append(label, body);
    messagesNode.append(node);
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return body;
  };
  const setStatus = (message, planMessage) => {
    statusNode.textContent = message;
    if (planMessage) planNode.textContent = planMessage;
  };
  const refreshUsage = async () => {
    const response = await fetch(`${apiBase}/api/ai/public/usage`, { credentials: 'include', cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      usage = null;
      usageNode.textContent = '';
      if (response.status === 401) setStatus('Sign in with a verified SYNBAI account to use chat.', 'Account sign-in required');
      else if (response.status === 403) setStatus('An active Trial, Starter or Pro plan is required.', 'Plan access required');
      else setStatus('Chat allowance could not be loaded. Refresh the page and try again.', 'NEXUS AI');
      send.disabled = true;
      return;
    }
    usage = data;
    planNode.textContent = `${data.plan.toUpperCase()} PLAN`;
    usageNode.textContent = `${number(data.remaining_today)} / ${number(data.daily_limit)} tokens left today`;
    setStatus(`Resets at ${new Date(data.reset_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' })}. Allowance follows your account plan, not your wallet balance.`);
    send.disabled = data.remaining_today <= 0;
    if (data.remaining_today <= 0) setStatus('Today’s AI allowance is used. It resets at 00:00 UTC.');
  };

  document.querySelectorAll('[data-nexus-ai-prompt]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.nexusAiPrompt || '';
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  const streamAnswer = async (messages, body) => {
    const response = await fetch(`${apiBase}/api/ai/public/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/x-ndjson' },
      body: JSON.stringify({ messages })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || (response.status === 401 ? 'Sign in to continue.' : response.status === 403 ? 'An active Trial, Starter or Pro plan is required.' : response.status === 429 ? 'The daily allowance is used or the assistant is busy. Try again shortly.' : 'The assistant could not answer. Please try again.'));
    }
    if (!response.body) throw new Error('Streaming is unavailable in this browser. Refresh and try again.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let answer = '';
    let doneReason = '';
    const consume = line => {
      if (!line.trim()) return;
      const data = JSON.parse(line);
      if (data.error) throw new Error(data.error);
      const piece = data.message?.content || '';
      if (piece) {
        answer += piece;
        body.textContent = answer;
      }
      if (data.done) doneReason = data.done_reason || (Number(data.eval_count) >= 768 ? 'length' : '');
    };
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      lines.forEach(consume);
      if (done) break;
    }
    if (pending.trim()) consume(pending);
    return { answer, doneReason };
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || send.disabled) return;
    input.value = '';
    bubble('user', question);
    history.push({ role: 'user', content: question });
    let answerNode = bubble('assistant');
    send.disabled = true;
    setStatus('NEXUS AI is preparing a response…');
    let completeAnswer = '';
    try {
      let requestMessages = history.slice(-4).map(message => message.role === 'assistant'
        ? { ...message, content: message.content.slice(-500) }
        : message);
      let continuedParts = 0;
      while (true) {
        const result = await streamAnswer(requestMessages, answerNode);
        completeAnswer += (completeAnswer ? '\n\n' : '') + result.answer;
        if (result.doneReason !== 'length') break;
        if (++continuedParts > 8) throw new Error('The answer is still incomplete after several continuation messages. Ask Nexus AI to continue.');
        setStatus('Continuing the answer in another message…');
        answerNode = bubble('assistant', '', true);
        requestMessages = [
          { role: 'user', content: question },
          { role: 'assistant', content: completeAnswer.slice(-1200) },
          { role: 'user', content: 'Continue the same answer directly from where it stopped. Do not repeat the text shown above. Finish the requested explanation and steps.' }
        ];
      }
      if (completeAnswer) history.push({ role: 'assistant', content: completeAnswer });
      if (history.length > 8) history.splice(0, history.length - 8);
      await refreshUsage();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant could not answer.';
      if (completeAnswer) bubble('assistant', `I could not finish the answer: ${message}`);
      else {
        answerNode.textContent = message;
        answerNode.dataset.error = 'true';
      }
      setStatus(message);
      send.disabled = false;
    }
  });

  refreshUsage().catch(() => setStatus('Sign in with your SYNBAI account to use chat.', 'Account sign-in required'));
})();
