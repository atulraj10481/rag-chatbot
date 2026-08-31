(function () {
  // Prevent duplicate initialization
  if (window.__RAG_CHATBOT_INITIALIZED__) return;
  window.__RAG_CHATBOT_INITIALIZED__ = true;

  // Find script tag configuration
  const currentScript = document.currentScript || document.querySelector('script[src*="embed.js"]');
  const baseUrl = currentScript ? new URL(currentScript.src).origin : window.location.origin;
  const primaryColor = currentScript?.getAttribute('data-primary-color') || '#3b82f6';
  const title = currentScript?.getAttribute('data-title') || 'Company Assistant';
  const department = currentScript?.getAttribute('data-department') || 'general';

  // Create floating bubble button
  const button = document.createElement('div');
  button.id = 'rag-chatbot-bubble';
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    backgroundColor: primaryColor,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
    cursor: 'pointer',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '24px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  });
  button.innerHTML = '💬';

  // Create iframe container
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'rag-chatbot-iframe-container';
  Object.assign(iframeContainer.style, {
    position: 'fixed',
    bottom: '86px',
    right: '20px',
    width: '380px',
    height: '600px',
    maxHeight: 'calc(100vh - 100px)',
    maxWidth: 'calc(100vw - 40px)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
    zIndex: '999999',
    opacity: '0',
    pointerEvents: 'none',
    transform: 'translateY(10px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  });

  const widgetUrl = `${baseUrl}/widget?primaryColor=${encodeURIComponent(primaryColor)}&title=${encodeURIComponent(title)}&department=${encodeURIComponent(department)}`;
  const iframe = document.createElement('iframe');
  iframe.src = widgetUrl;
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
  });

  iframeContainer.appendChild(iframe);
  document.body.appendChild(button);
  document.body.appendChild(iframeContainer);

  let isOpen = false;
  button.addEventListener('click', function () {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.style.opacity = '1';
      iframeContainer.style.pointerEvents = 'auto';
      iframeContainer.style.transform = 'translateY(0)';
      button.innerHTML = '✕';
      button.style.transform = 'scale(0.95)';
    } else {
      iframeContainer.style.opacity = '0';
      iframeContainer.style.pointerEvents = 'none';
      iframeContainer.style.transform = 'translateY(10px)';
      button.innerHTML = '💬';
      button.style.transform = 'scale(1)';
    }
  });
})();
