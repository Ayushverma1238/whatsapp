import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "./Layout";
import ChatList from "../pages/chatSection/ChatList";
import useLayoutStore from "../store/layoutStore";
import { getAllUsers } from "../services/user_services";

const HomePage = () => {
  const setSelectedContact = useLayoutStore((state) => state.setSelectedContact)
  const [allUsers, setallUsers] = useState([]);
  const getAllUser = async () => {
    try {
      const result = await getAllUsers();
      if (result.status === "success") {
        setallUsers(result.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getAllUser();
  }, []);


  return (
    <div>
      <Layout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ChatList
            contacts={allUsers}
            setSelectedContact ={setSelectedContact}
           />
        </motion.div>
      </Layout>
    </div>
  );
};

export default HomePage;
