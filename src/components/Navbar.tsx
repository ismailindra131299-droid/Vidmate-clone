import React from 'react';
import { AiOutlineHome, AiFillHome } from 'react-icons/ai';
import { IoMusicalNotesOutline, IoMusicalNotes } from 'react-icons/io5';
import { HiOutlineDownload, HiDownload } from 'react-icons/hi';
import { RiUser3Line, RiUser3Fill } from 'react-icons/ri';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const tabs = [
    { id: 'rumah', label: 'RUMAH', IconActive: AiFillHome, IconInactive: AiOutlineHome },
    { id: 'musik', label: 'MUSIK', IconActive: IoMusicalNotes, IconInactive: IoMusicalNotesOutline },
    { id: 'file', label: 'FILE SAYA', IconActive: HiDownload, IconInactive: HiOutlineDownload },
    { id: 'saya', label: 'SAYA', IconActive: RiUser3Fill, IconInactive: RiUser3Line },
  ];

  return (
    <div style={styles.navContainer}>
      {tabs.map((tab) => {
        const IsActive = currentTab === tab.id;
        const Icon = IsActive ? tab.IconActive : tab.IconInactive;

        return (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            style={styles.navButton}
          >
            <Icon style={{ ...styles.icon, color: IsActive ? '#e53935' : '#757575' }} />
            <span style={{ ...styles.label, color: IsActive ? '#e53935' : '#757575', fontWeight: IsActive ? 'bold' : 'normal' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const styles = {
  navContainer: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1000,
    paddingBottom: 'safe-area-inset-bottom', // Menyesuaikan layar HP modern
  },
  navButton: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    cursor: 'pointer',
    flex: 1,
  },
  icon: {
    fontSize: '22px',
    marginBottom: '2px',
  },
  label: {
    fontSize: '10px',
  },
};

export default Navbar;
