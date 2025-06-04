import React, { createContext, useContext, useState } from "react";

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState({
    name: "JUAN DELA CRUZ",
    username: "juancruz",
    email: "juan@email.com",
    address: "123 Main St, Manila",
    phone: "09123456789",
    avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
  });

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);