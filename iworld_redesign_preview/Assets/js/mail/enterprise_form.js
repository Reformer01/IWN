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

const enterpriseMail = async(formData) => {
  try {
    const response = await axios.post(`${dbURI}/enterprise`, formData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};


const notificationsContainer = document.getElementById('notificationsContainer');
const enterpriseForm = document.getElementById('enterpriseForm');

enterpriseForm.addEventListener('submit', async(e) => {
  e.preventDefault();

  const formData = {
    name: enterpriseForm.name.value,
    companyName: enterpriseForm.companyName.value,
    email: enterpriseForm.email.value,
    phoneNumber: enterpriseForm.phoneNumber.value,
    state: enterpriseForm.state.value,
    city: enterpriseForm.city.value,
    address: enterpriseForm.address.value,
  };

  enterpriseMail(formData)
  .then(result => {
    toaster("success", result.message, notificationsContainer);
    enterpriseForm.reset();

  }).catch(error => {
    toaster("danger", error.message, notificationsContainer);
  })

})



