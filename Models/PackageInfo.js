const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
const Schema = mongoose.Schema;

const PackageInfoSchema = new Schema({
    apk: {
        type: String,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    version_name: {
        type: String,
        required: true
    },
    updated: {
        type: Boolean,
        required: true
    }
});

let PackageInfo = mongoose.model("PackageInfo", PackageInfoSchema);
module.exports = PackageInfo;