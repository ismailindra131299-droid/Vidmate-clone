import React, { useState } from 'react';
import { AiOutlineSearch, AiOutlineDownload } from 'react-icons/ai';

interface HeaderProps {
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim() !== '') {
      onSearch(inputUrl);
    }
  };

  return (
    <div style={styles.headerContainer}>
      <form onSubmit={handleSubmit} style={styles.searchForm}>
        <AiOutlineSearch style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Cari Atau Masukkan URL"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          style={styles.searchInput}
        />
        {inputUrl && (
          <button type="submit" style={styles.goButton}>
            Go
          </button>
        )}
      </form>
      <div style={styles.downloadIconContainer}>
        <AiOutlineDownload style={styles.downloadTopIcon} />
      </div>
    </div>
  );
};

const styles = {
  headerContainer: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    zIndex: 1000,
  },
  searchForm: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: '24px',
    flex: 1,
    height: '38px',
    padding: '0 12px',
    position: 'relative' as const,
  },
  searchIcon: {
    fontSize: '20px',
    color: '#757575',
    marginRight: '8px',
  },
  searchInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
    color: '#333333',
  },
  goButton: {
    backgroundColor: '#e53935',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    marginLeft: '4px',
  },
  downloadIconContainer: {
    marginLeft: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  downloadTopIcon: {
    fontSize: '24px',
    color: '#333333',
  },
};

export default Header;
