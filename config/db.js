// import mongoose from 'mongoose'
// import dotenv from 'dotenv'

// dotenv.config()

// const DB_URL = process.env.DB_URL
// const connectDB = async () => {
//     if (!DB_URL) {
//         console.error("Error: DB_URL is not defined in environment variables.");
//         process.exit(1);
//     }
//     try {
//         // await mongoose.connect(DB_URL )
//         await mongoose.connect(DB_URL, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//             writeConcern: { w: "majority" }
//         })
//         console.log("databse connected");
//     } catch (error) {
//         console.log(error.message);
//         process.exit(1);
//     }
// }

// export default connectDB










import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const DB_URL = process.env.DB_URL

const connectDB = async () => {
    if (!DB_URL) {
        throw new Error('DB_URL is not defined in environment variables.')
    }

    try {
        await mongoose.connect(DB_URL, {
            writeConcern: { w: 'majority' },
        })

        console.log('Database connected')
    } catch (error) {
        console.error('Database connection failed:', error.message)
        throw error
    }
}

export default connectDB
