// Initialize dotenv
require('dotenv').config();
const cmd = require('../Middleware/shellCmd');
const reports = require('../Middleware/reportAssembler');
const timeoutTime = 3000;
const REPORT_PATH = process.env.REPORTS_PATH;
// REPORTS_PATH = "Reports/";

module.exports = {
    showConnectedDevices: (req, res) => {
        cmd.adbDevices((STDOUT) => {
            res.status(200).json(STDOUT);
        });
    },
    connectAdbDevice: (req, res) => {
        cmd.adbConnect(req.body.ip, (STDOUT) => {
            res.status(200).json(STDOUT);
        });
    },
    startAudit: (req, res) => {
        let ip_address = req.body.ip;

        // get serialNumber so we can name the report after it
        cmd.getSerialNumber(ip_address, (SN) => {
            // generate rawReport using ADB dumpsys
            cmd.generateRawReport(ip_address, SN, (data) => {
                console.log("Data generated with filename: " + data);
            });
        });


        // now reports might take a few seconds to generate
        // and since the code below rely on the report generated by the above code
        // we will handle it via timeout for 3 seconds
        setTimeout(function () {
            // after 3 seconds
            // get TVs serial number this will be the filename of the report
            cmd.getSerialNumber(ip_address, (SN) => {
                // now we need to clean the rawReport generated earlier
                // the file path for the generated report will be the Reports/SerialNumber-RAW.txt
                reports.cleanThenReadRawReport(REPORT_PATH + SN + "-RAW.txt", (currentData) => {
                    // get all the package currently installed
                    // we need this later for comparison
                    let currentPackageList = currentData.packageList; // this is an array

                    // then read for the previous database
                    // filename should be the serialNumber
                    reports.readJSONDataBase(SN, (dataFromDB) => {
                        // check and see the that database/json exists
                        if (!dataFromDB) {
                            // if not then save the currentData as the new one
                            // the filename should be the serialNumber so we pass that too
                            reports.saveReportToJSON(currentData, SN);

                            // now we done, i need a flag to let react know
                            // so it can grab the new data from that report we just saved.
                            res.status(200).json({ 'SN': SN, "currentData": currentData });
                        } else {
                            // if the database/json exists then we need to compare
                            // the old version of each PKG to the new version
                            // loop through all the packageList
                            for (i in currentPackageList) {
                                // im going to save the data we are going to compare
                                // to avoid confusion
                                let oldData = dataFromDB[currentPackageList[i]];
                                let newData = currentData[currentPackageList[i]];

                                // first we need to check if the PKG exists in the old one
                                if (!oldData) {
                                    // if not, meaning this is a new installed app
                                    // by default updated is set to true so basically we dont have to do anything
                                    // this is just a place holder in case I want to flag the newly installed app in the future
                                    console.log("new app alert!");
                                } else {
                                    // comapare the version of each pkg
                                    if (oldData.versionName === newData.versionName) {
                                        // if the same then no update
                                        // change the newData's updated = false;
                                        newData.updated = false;
                                    } else {
                                        // set if the true if not same
                                        newData.updated = true;
                                    }
                                }
                            }

                            // after all that loop save the updated currentData as the new database
                            reports.saveReportToJSON(currentData, SN);

                            // now we done again, i need a flag to let react know
                            // so it can grab the new data from that report we just saved.
                            res.status(200).json({ 'SN': SN, "currentData": currentData });
                        }
                    });
                });
            });
        }, timeoutTime);
    }
}
