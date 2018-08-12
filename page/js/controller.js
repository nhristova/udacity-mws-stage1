import { ToastrService } from './toasty.js';

const toasty = new ToastrService();

export function MainController() {

    if (!navigator.onLine) {
        toasty.showMessage('No internet connection, loading from cache.', toasty.type.error);
    }

    // this.dbPromise = openDatabase();
    this.registerServiceWorker();
}

MainController.prototype.registerServiceWorker = function() {
    // Check support for serviceWorker
    // skip SW functions if no support
    if (!navigator.serviceWorker) { return; }
    toasty.showMessage('Starting SW registration', toasty.type.warning);
    
    const mainController = this;

    navigator.serviceWorker.register('/sw.js')
        .then(function(reg) {
            console.log('SW registered');

            // If there is no controller, this page was NOT loaded via a SW
            // so this is the latest version, exit
            if (!navigator.serviceWorker.controller) {
                console.log('Latest version');
                return;
            }

            // Updated SW waiting, call function to show toast message
            if (reg.waiting) {
                console.log('SW waiting');
                mainController.updateReady(reg.waiting);
                return;
            }

            // Updated SW is installing, track progress 
            // and call updateReady when it is installed
            if (reg.installing) {
                console.log('SW installing');
                mainController.trackInstalling(reg.installing);
                return;
            }

            // Listen for incoming SW and track them
            // Fires when SW waiting found too
            reg.onupdatefound = () => {
                if (reg.installing) {
                    console.log('Caught a SW installing!');
                    mainController.trackInstalling(reg.installing);
                }
                if (reg.waiting) {
                    console.log('Caught a SW waiting');
                    mainController.updateReady(reg.waiting);
                }

            };
        })
        .catch((err) => console.log('Error registering serviceWorker', err));

    // Ensure refresh is only called once.
    // This works around a bug in "force update on reload".
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
};

MainController.prototype.trackInstalling = function(worker) {
    const mainController = this;

    console.log('Track installing');
    worker.addEventListener('statechange', function(event) {
        console.log('State change: ', worker.state);

        if (worker.state == 'installed') {
            mainController.updateReady(worker);
        }
    });
};

MainController.prototype.updateReady = function(worker) {
    const thisWorker = worker;

    const updateClick = function(event) {
        const dataAction = event.target.getAttribute('data-action');

        if (dataAction === 'update') {
            thisWorker.postMessage({ action: 'skipWaiting' });
        }

        event.target.closest('.toast').remove();
    };

    toasty.showMessage('New SW version ready,  update?<br /><button type="button" class="btn btn-default" data-action="update" id="okBtn">Yes</button> <button type="button" class="btn btn-default" data-action="noupdate" id="noBtn">No</button>', toasty.type.info, {onclick: updateClick});
};
