const dbURI = 'https://i-world-mail-server.onrender.com/mail';

// toast function
const toaster = (color, message, notificationsContainer) => {
  const toast = document.createElement('div');
  toast.innerHTML = `
  <div class="toast align-items-center text-white bg-${color} border-0 mt-2 show" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="false">
  <div class="d-flex">
    <div class="toast-body">
      ${message}
    </div>
    <button aria-label="Close" class="btn-close fs-20 ms-auto mt-2 pe-2" data-bs-dismiss="toast"><span aria-hidden="true">×</span></button>
  </div>
  </div>`;

  notificationsContainer.prepend(toast);

  setTimeout(() => {
    toast.style.display = "none";
  }, 4000);
}

const signupMail = async(formData) => {
  try {
    const response = await axios.post(`${dbURI}/register`, formData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

const notificationsContainer = document.getElementById('notificationsContainer');

document.getElementById('signupForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = {
    firstName: document.getElementById('input1').value,
    businessName: document.getElementById('input2').value,
    emailAddress: document.getElementById('input3').value,
    phoneNumber: document.getElementById('input4').value,
    companySize: document.getElementById('select1').value,
    currentITInfrastructure: document.getElementById('textarea1').value,
    currentITChallenges: document.getElementById('textarea').value,
    selectedServicesNeeded: Array.from(document.querySelectorAll('#signupForm .form-group:nth-child(5) .form-check-input'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.nextElementSibling.textContent.trim()),
    otherServices: document.getElementById('otherServices').value ? document.getElementById('otherServices').value : "None",
    selectedSLA: Array.from(document.querySelectorAll('#signupForm .form-group:nth-child(8) .form-check-input'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.nextElementSibling.textContent.trim()),
    customSLA: document.getElementById('customSLA').value ? document.getElementById('customSLA').value : "None",
    selectedBudgetRange: Array.from(document.querySelectorAll('#signupForm .form-group:nth-child(10) .form-check-input'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.nextElementSibling.textContent.trim()),
    selectedHowYouHeard: Array.from(document.querySelectorAll('#signupForm .form-group:nth-child(11) .form-check-input'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.nextElementSibling.textContent.trim()),
    otherHeardAboutUs: document.getElementById('otherHeardAboutUs').value ? document.getElementById('otherHeardAboutUs').value : "None",
    additionalComments: document.getElementById('additionalComments').value ? document.getElementById('additionalComments').value : "None"
  };

  signupMail(formData)
  .then(result => {
    toaster("success", result.message, notificationsContainer);
    document.getElementById('signupForm').reset();

  }).catch(error => {
    toaster("danger", error.message, notificationsContainer);
  })

})



