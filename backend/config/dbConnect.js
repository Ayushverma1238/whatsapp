const mongoose = require("mongoose")


const connectDb = async() =>{
    try {
        await mongoose.connect(process.env.MONGO_URI)

        console.log("Mongo db connect")
    } catch (error) {
        console.log("Error to connect mongo db ", error)
        process.exit(1);

    }
}

module.exports = connectDb;