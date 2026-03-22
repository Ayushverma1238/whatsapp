const mongoose = require("mongoose")



const messageSchema = new mongoose.Schema({
    conversation:{type:mongoose.Schema.Types.ObjectId, ref:"Conversation", required:true},
    sender:{require: true,type:mongoose.Schema.Types.ObjectId, ref:"User"},
    receiver:{require: true,type:mongoose.Schema.Types.ObjectId, ref:"User"},
    content:{type:String},
    imageOrVideoUrl:{type:String},
    contentType:{type:String, enum:['image', 'video', 'text']},
    reaction:[
        {
            sender:{require: true,type:mongoose.Schema.Types.ObjectId, ref:"User"},
            emoji:{type:String}
        },
    ],
    messageStatus:{type:String, default:'send'},

},{timestamps:true})


const Message = mongoose.model("Message", messageSchema);

module.exports = Message