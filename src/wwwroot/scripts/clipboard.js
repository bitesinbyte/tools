window.clipboardCopy = {
  copyText: function (url) {
    navigator.clipboard
      .writeText(url)
      .then(function () {
        alert("Copied to clipboard!");
      })
      .catch(function (error) {
        alert(error);
      });
  },
};
