/**
 * local-adapter.js
 * Universal Polyfill for google.script.run when running on Local Server
 * Seamlessly integrates with Node.js / Local Python API endpoints
 */
(function() {
    // If native google.script.run is provided by Google Apps Script runtime, do not override
    if (typeof window.google !== 'undefined' && window.google.script && window.google.script.run) {
        return;
    }

    // Identify current exam context from path
    var path = window.location.pathname.toLowerCase();
    var examType = 'exam_wifi';
    if (path.indexOf('websocket') !== -1) {
        examType = 'exam_websocket';
    } else if (path.indexOf('wifi') !== -1) {
        examType = 'exam_wifi';
    } else if (path.indexOf('digital') !== -1) {
        examType = 'exam_digitalpin_digitalsensor';
    } else if (path.indexOf('analog') !== -1) {
        examType = 'exam_analogpin_analogsensor';
    }

    function LocalScriptRunner() {
        this._successHandler = function() {};
        this._failureHandler = function(err) { console.error("LocalRunner Error:", err); };
    }

    LocalScriptRunner.prototype.withSuccessHandler = function(handler) {
        this._successHandler = handler;
        return this;
    };

    LocalScriptRunner.prototype.withFailureHandler = function(handler) {
        this._failureHandler = handler;
        return this;
    };

    LocalScriptRunner.prototype.checkStudentSubmitted = function(studentId) {
        var self = this;
        fetch('/api/check-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: studentId, examType: examType })
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return res.json();
        })
        .then(function(data) { self._successHandler(data); })
        .catch(function(err) { self._failureHandler(err); });
    };

    LocalScriptRunner.prototype.processQuiz = function(params) {
        var self = this;
        var payload = Object.assign({}, params, { examType: examType });
        fetch('/api/process-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return res.json();
        })
        .then(function(data) { self._successHandler(data); })
        .catch(function(err) { self._failureHandler(err); });
    };

    LocalScriptRunner.prototype.logBehavior = function(studentId, studentName, studentRoom, actionType, count) {
        var self = this;
        fetch('/api/log-behavior', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: studentId,
                studentName: studentName,
                studentRoom: studentRoom,
                actionType: actionType,
                count: count,
                examType: examType
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { self._successHandler(data); })
        .catch(function(err) { self._failureHandler(err); });
    };

    window.google = {
        script: {
            get run() {
                return new LocalScriptRunner();
            }
        }
    };

    console.log("⚡ [Local Adapter] Active for local testing (" + examType + ")");
})();
