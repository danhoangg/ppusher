function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function submitSignup() {
  if (!CheckInfo()) return;

  fetch('/account/signup', {
    method: 'POST', 
    body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value, email: document.getElementById('email').value, startingBal: document.getElementById('startingBal').value }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(response => response.json());
}

function submitLogin() {
  if (!CheckInfo()) return;

}

function CheckInfo() {
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var repassword = document.getElementById('repassword').value;
  var email = document.getElementById('email').value;
  var startingBal = document.getElementById('startingBal').value;
  mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

  if (!username || !password || !repassword || !email || !startingBal) {
    alert('One or more entries are empty');
    return false;
  } else if (password != repassword) {
    document.getElementById('error3').textContent = "Passwords don't match";
    return false;
  } else if (!email.match(mailformat)) {
    document.getElementById('error4').textContent = "Invalid email";
    return false;
  } else if (isNaN(startingBal)) {
    document.getElementById('error5').textContent = "Invalid value";
    return false;
  } else if (startingBal < 10000 || startingBal > 1000000) {
    document.getElementById('error5').textContent = "Valid values range between 10k and 1m";
    return false;
  } else {
    return true;
  }
}
