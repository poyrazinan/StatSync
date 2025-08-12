const $ = (id) => document.getElementById(id);
function setStatus(t) { $("status").textContent = t; }

$("save").addEventListener("click", () => {
  const channel = $("channel").value.trim();
  const cookie  = $("cookie").value.trim();
  overwolf.settings.setStorage("kick_channel", channel, () => {});
  if (cookie) saveCookieEncrypted(cookie);
  setStatus("Saved. Close this window.");
});

$("test").addEventListener("click", async () => {
  const channel = $("channel").value.trim();
  const cookie  = $("cookie").value.trim();
  if (!channel || !cookie) return setStatus("Fill channel & cookie first.");
  try {
    const res = await fetch("https://kick.com/api/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cookie": `__Secure-next-auth.session-token=${cookie}`
      },
      body: JSON.stringify({
        query: "query($slug:String!){ channel(slug:$slug){ id } }",
        variables: { slug: channel }
      })
    });
    const j = await res.json();
    if (j?.data?.channel?.id) {
      setStatus("OK! Channel ID: " + j.data.channel.id);
    } else {
      setStatus("Failed. Check cookie/channel.");
    }
  } catch (e) {
    setStatus("Error: " + e.message);
  }
});

window.onload = () => {
  overwolf.settings.getStorage("kick_channel", r => { if (r?.value) $("channel").value = r.value; });
  loadCookieEncrypted((cookie) => { if (cookie) $("cookie").value = ""; });
};
