document.addEventListener('click', function (event) {
  var trigger = event.target.closest('.demo-tag, [data-demo-open]');
  if (!trigger) return;
  var card = trigger.closest('[data-video-id]');
  var id = trigger.dataset.videoId || (card && card.dataset.videoId);
  if (!id || !/^[\w-]{11}$/.test(id)) return;
  event.preventDefault();
  event.stopPropagation();
  var dialog = document.getElementById('pd-demo');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'pd-demo';
    dialog.innerHTML = '<button type="button" aria-label="Close demo">×</button><div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('button').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function () { dialog.querySelector('div').replaceChildren(); });
  }
  var frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&autoplay=1';
  frame.title = (card && card.dataset.videoTitle) || trigger.title || 'Demo video';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture';
  frame.allowFullscreen = true;
  frame.style.cssText = 'width:min(80vw,960px);aspect-ratio:16/9;border:0';
  dialog.querySelector('div').replaceChildren(frame);
  dialog.showModal();
});
