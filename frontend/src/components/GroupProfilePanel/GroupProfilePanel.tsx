'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import { usePanels } from '@/contexts/PanelContext';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import CoverImageCropper from '@/components/image-manip/CoverImageCropper/CoverImageCropper';
import ProfileImageCropper from '@/components/image-manip/ProfileImageCropper/ProfileImageCropper';
import { useOpenUserProfile } from '@/hooks/useOpenUserProfile';
import SettingsPanel from '@/components/settings/SettingsPanel';
import AddGroupMembersPanel from './AddGroupMembersPanel';
import styles from './GroupProfilePanel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  status?: string;
  user: { id: string; username: string; displayName: string | null; profileImage: string | null };
}

interface GroupInfo {
  id: string;
  name: string;
  description?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  ownerId: string;
  members: GroupMember[];
}

interface Props {
  groupId: string;
  currentUserId: string;
  onGroupLeft?: () => void;
}

export default function GroupProfilePanel({ groupId, currentUserId, onGroupLeft }: Props) {
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);

  useEffect(() => {
    if (avatarMenuOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setAvatarMenuVisible(true)));
    }
  }, [avatarMenuOpen]);

  const closeAvatarMenu = () => {
    setAvatarMenuVisible(false);
    setTimeout(() => setAvatarMenuOpen(false), 250);
  };

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const coverFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverMenuRef = useRef<HTMLDivElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { openPanel, closePanel, updatePanelMeta } = usePanels();
  const openUserProfile = useOpenUserProfile();

  const isDark = typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') !== 'light'
    : true;

  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchGroup = useCallback(async (retries = 2) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setGroup(data.group);
    } catch (e: any) {
      if (retries > 0) {
        retryTimer.current = setTimeout(() => fetchGroup(retries - 1), 1500);
        return;
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
    return () => clearTimeout(retryTimer.current);
  }, [fetchGroup]);

  // Close menus on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (coverMenuRef.current && !coverMenuRef.current.contains(e.target as Node)) {
        setCoverMenuOpen(false);
      }
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node) &&
          avatarBtnRef.current && !avatarBtnRef.current.contains(e.target as Node)) {
        closeAvatarMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen for real-time group updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.group?.id === groupId) {
        setGroup(prev => prev ? { ...prev, ...detail.group } : prev);
      }
    };
    window.addEventListener('chatr:group-profile-updated', handler);
    return () => window.removeEventListener('chatr:group-profile-updated', handler);
  }, [groupId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <i className="fa-solid fa-circle-notch fa-spin" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <i className="fa-solid fa-users-slash" style={{ fontSize: '32px' }} />
          <span>Could not load group</span>
        </div>
      </div>
    );
  }

  const myMember = group.members.find(m => m.userId === currentUserId);
  const isOwner = group.ownerId === currentUserId;
  const isAdmin = isOwner || myMember?.role === 'admin';

  const nameOf = (m: GroupMember) =>
    (m.user.displayName || m.user.username.replace(/^@/, '')).toLowerCase();
  const alphSort = (a: GroupMember, b: GroupMember) => nameOf(a).localeCompare(nameOf(b));

  const activeMembers = group.members.filter(m => m.status !== 'pending');
  const owners = activeMembers.filter(m => m.userId === group.ownerId).sort(alphSort);
  const admins = activeMembers.filter(m => m.role === 'admin' && m.userId !== group.ownerId).sort(alphSort);
  const regulars = activeMembers.filter(m => m.role !== 'admin' && m.userId !== group.ownerId).sort(alphSort);
  const pending = group.members.filter(m => m.status === 'pending').sort(alphSort);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  // ── Cover image handlers ─────────────────────────────────────────────
  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('Only JPEG, PNG, and WebP images are allowed', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10MB', 'error');
      e.target.value = '';
      return;
    }
    setSelectedCoverFile(file);
    setShowCoverCropper(true);
    e.target.value = '';
  };

  const handleCoverCropComplete = async (croppedFile: File) => {
    setShowCoverCropper(false);
    setSelectedCoverFile(null);
    setCoverUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const form = new FormData();
      form.append('coverImage', croppedFile);
      const res = await fetch(`${API}/api/groups/${groupId}/cover-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setGroup(prev => prev ? { ...prev, coverImage: data.url } : prev);
      showToast('Cover image updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload cover image', 'error');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleDeleteCover = async () => {
    setCoverMenuOpen(false);
    setCoverUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API}/api/groups/${groupId}/cover-image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroup(prev => prev ? { ...prev, coverImage: null } : prev);
      showToast('Cover image removed', 'success');
    } catch {
      showToast('Failed to remove cover image', 'error');
    } finally {
      setCoverUploading(false);
    }
  };

  // ── Avatar image handlers ────────────────────────────────────────────
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('Only JPEG, PNG, and WebP images are allowed', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      e.target.value = '';
      return;
    }
    setSelectedAvatarFile(file);
    setShowAvatarCropper(true);
    e.target.value = '';
  };

  const handleAvatarCropComplete = async (croppedFile: File) => {
    setShowAvatarCropper(false);
    setSelectedAvatarFile(null);
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const form = new FormData();
      form.append('profileImage', croppedFile);
      const res = await fetch(`${API}/api/groups/${groupId}/profile-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setGroup(prev => prev ? { ...prev, profileImage: data.url } : prev);
      updatePanelMeta(`group-profile-${groupId}`, { profileImage: data.url });
      updatePanelMeta(`group-${groupId}`, { profileImage: data.url });
      showToast('Group avatar updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload group avatar', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    closeAvatarMenu();
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API}/api/groups/${groupId}/profile-image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroup(prev => prev ? { ...prev, profileImage: null } : prev);
      updatePanelMeta(`group-profile-${groupId}`, { profileImage: null });
      updatePanelMeta(`group-${groupId}`, { profileImage: null });
      showToast('Group avatar removed', 'success');
    } catch {
      showToast('Failed to remove group avatar', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Member actions ───────────────────────────────────────────────────
  const handlePromote = async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const confirmed = await showConfirmation({
      title: 'Make Admin',
      message: `Make ${name} an admin? They will be able to edit the group, manage members, and remove other members.`,
      urgency: 'info',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Make Admin', variant: 'primary', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/members/${member.userId}/promote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.map(m =>
            m.userId === member.userId ? { ...m, role: 'admin' } : m
          ),
        } : prev);
        showToast(`${name} is now an admin`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to promote member', 'error');
      }
    } catch {
      showToast('Failed to promote member', 'error');
    }
  };

  const handleDemote = async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const confirmed = await showConfirmation({
      title: 'Remove Admin',
      message: `Remove admin privileges from ${name}? They will become a regular member.`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Remove Admin', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/members/${member.userId}/demote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.map(m =>
            m.userId === member.userId ? { ...m, role: 'member' } : m
          ),
        } : prev);
        showToast(`${name} is now a regular member`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to demote member', 'error');
      }
    } catch {
      showToast('Failed to demote member', 'error');
    }
  };

  const openAddMembersPanel = () => {
    const panelId = `add-members-${groupId}`;
    openPanel(
      panelId,
      <AddGroupMembersPanel
        groupId={groupId}
        existingMemberIds={group.members.map(m => m.userId)}
        onMembersAdded={() => {
          fetchGroup();
        }}
      />,
      'Add Members',
      'center',
      undefined,
      undefined,
      true,
    );
  };

  const startEditingName = () => {
    if (!group || !isAdmin) return;
    setNameValue(group.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleSaveName = async () => {
    if (!group) return;
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === group.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        const newName = data.group.name;
        setGroup(prev => prev ? { ...prev, name: newName } : prev);
        updatePanelMeta(`group-${groupId}`, { title: newName });
        updatePanelMeta(`group-profile-${groupId}`, { title: newName });
        showToast('Group name updated', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to update name', 'error');
      }
    } catch {
      showToast('Failed to update name', 'error');
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  };

  const handleLeaveGroup = async () => {
    const confirmed = await showConfirmation({
      title: 'Leave Group',
      message: isOwner
        ? `You are the owner of "${group.name}". Leaving will promote another member to owner. Continue?`
        : `Leave "${group.name}"?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Leave Group', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Left "${group.name}"`, 'success');
        closePanel(`group-profile-${groupId}`);
        onGroupLeft?.();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to leave group', 'error');
      }
    } catch {
      showToast('Failed to leave group', 'error');
    }
  };

  return (
    <div className={styles.page}>
      {/* Cover image cropper */}
      {showCoverCropper && selectedCoverFile && (
        <CoverImageCropper
          imageFile={selectedCoverFile}
          onCropComplete={handleCoverCropComplete}
          onCancel={() => { setShowCoverCropper(false); setSelectedCoverFile(null); }}
          isDark={isDark}
        />
      )}

      {/* Avatar image cropper */}
      {showAvatarCropper && selectedAvatarFile && (
        <ProfileImageCropper
          imageFile={selectedAvatarFile}
          onCropComplete={handleAvatarCropComplete}
          onCancel={() => { setShowAvatarCropper(false); setSelectedAvatarFile(null); }}
          isDark={isDark}
        />
      )}

      {/* Hidden file inputs */}
      <input ref={coverFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleCoverFileSelect} style={{ display: 'none' }} />
      <input ref={avatarFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarFileSelect} style={{ display: 'none' }} />

      {/* Hero: cover + avatar */}
      <div className={styles.hero}>
        <div className={styles.cover}>
          <img
            src={group.coverImage || '/cover/default-cover.jpg'}
            alt="Cover"
            className={styles.coverImg}
            style={{ opacity: coverUploading ? 0.5 : 1 }}
          />

          {coverUploading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#fff' }} />
            </div>
          )}

          {isAdmin && !coverUploading && (
            <>
              <button
                className={styles.coverCameraBtn}
                onClick={() => setCoverMenuOpen(prev => !prev)}
                aria-label="Change cover image"
              >
                <i className="fas fa-camera" />
              </button>
              {coverMenuOpen && (
                <div
                  ref={coverMenuRef}
                  className={styles.contextMenu}
                  style={{
                    bottom: '64px', right: '16px',
                    background: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                  }}
                >
                  {group.coverImage && (
                    <button className={styles.contextMenuItemDanger} onClick={handleDeleteCover}>
                      <i className="fas fa-trash-alt" style={{ width: '20px' }} /> Remove Cover
                    </button>
                  )}
                  <button
                    className={styles.contextMenuItem}
                    style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}
                    onClick={() => { setCoverMenuOpen(false); setTimeout(() => coverFileRef.current?.click(), 100); }}
                  >
                    <i className="fas fa-camera" style={{ width: '20px' }} /> Upload New Cover
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.avatarRing}>
          <div className={styles.avatarInner}>
            {group.profileImage ? (
              <img src={group.profileImage} alt={group.name} className={styles.avatarImg} style={{ opacity: avatarUploading ? 0.5 : 1 }} />
            ) : (
              <div className={styles.avatarFallback} style={{ opacity: avatarUploading ? 0.5 : 1 }}>
                {getInitial(group.name)}
              </div>
            )}

            {avatarUploading && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: '#fff' }} />
              </div>
            )}
          </div>

          {isAdmin && !avatarUploading && (
            <button
              ref={avatarBtnRef}
              className={styles.avatarCameraBtn}
              onClick={() => avatarMenuOpen ? closeAvatarMenu() : setAvatarMenuOpen(true)}
              aria-label="Change group avatar"
            >
              <i className="fas fa-camera" />
            </button>
          )}

          {avatarMenuOpen && (
            <div
              ref={avatarMenuRef}
              style={{
                position: 'absolute',
                bottom: '60px',
                left: '50%',
                transform: `translateX(-50%) scale(${avatarMenuVisible ? 1 : 0.95})`,
                opacity: avatarMenuVisible ? 1 : 0,
                transition: 'opacity 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transformOrigin: 'bottom center',
                backgroundColor: isDark ? '#1e293b' : 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                padding: '6px',
                zIndex: 200,
                width: '240px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: '2px',
              }}
            >
              {group.profileImage && (
                <button
                  onClick={handleDeleteAvatar}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', border: 'none', background: 'transparent',
                    color: '#ef4444', fontSize: '14px', fontWeight: '600',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    borderRadius: '8px', transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                    <i className="fas fa-trash-alt" />
                  </div>
                  Delete Group Picture
                </button>
              )}
              <button
                onClick={() => { closeAvatarMenu(); setTimeout(() => avatarFileRef.current?.click(), 250); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', border: 'none', background: 'transparent',
                  color: isDark ? '#e2e8f0' : '#1e293b', fontSize: '14px', fontWeight: '500',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  borderRadius: '8px', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                  <i className="fas fa-camera" />
                </div>
                Upload New Picture
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.nameBlock}>
          {editingName ? (
            <div className={styles.nameEditRow}>
              <input
                ref={nameInputRef}
                className={styles.nameInput}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                maxLength={64}
                disabled={savingName}
              />
              <button className={styles.nameSaveBtn} onClick={handleSaveName} disabled={savingName}>
                {savingName ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fas fa-check" />}
              </button>
              <button className={styles.nameCancelBtn} onClick={() => setEditingName(false)} disabled={savingName}>
                <i className="fas fa-xmark" />
              </button>
            </div>
          ) : (
            <div className={styles.nameRow} onClick={isAdmin ? startEditingName : undefined} style={{ cursor: isAdmin ? 'pointer' : undefined }}>
              <h2 className={styles.groupName}>{group.name}</h2>
              {isAdmin && <i className="fas fa-pen" style={{ fontSize: '16px', opacity: 0.5, color: 'var(--text-secondary)' }} />}
            </div>
          )}
          <p className={styles.memberCount}>
            {group.members.filter(m => m.status !== 'pending').length} member{group.members.filter(m => m.status !== 'pending').length !== 1 ? 's' : ''}
            {group.members.some(m => m.status === 'pending') && (
              <span style={{ opacity: 0.6 }}> · {group.members.filter(m => m.status === 'pending').length} pending</span>
            )}
          </p>
        </div>

        {/* Member groups */}
        {owners.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <i className="fas fa-crown" style={{ fontSize: '10px', color: '#f59e0b' }} />{' '}
              Owner{owners.length !== 1 ? 's' : ''}
            </h3>
            <div className={styles.sectionBody}>
              {owners.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={{ status: 'offline', lastSeen: null }} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {admins.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <i className="fas fa-shield" style={{ fontSize: '10px', color: '#6366f1' }} />{' '}
              Admin{admins.length !== 1 ? 's' : ''}
            </h3>
            <div className={styles.sectionBody}>
              {admins.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={{ status: 'offline', lastSeen: null }} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                    </div>
                    {isOwner && !isSelf && (
                      <div className={styles.memberActions}>
                        <button className={styles.actionBtn} onClick={() => handleDemote(member)} title={`Remove admin from ${name}`}>
                          <i className="fas fa-shield-xmark" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(regulars.length > 0 || pending.length > 0) && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <i className="fas fa-users" style={{ fontSize: '10px' }} />{' '}
              Members
            </h3>
            <div className={styles.sectionBody}>
              {regulars.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={{ status: 'offline', lastSeen: null }} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                    </div>
                    {isAdmin && !isSelf && (
                      <div className={styles.memberActions}>
                        <button className={styles.actionBtn} onClick={() => handlePromote(member)} title={`Make ${name} admin`}>
                          <i className="fas fa-shield" /> Make Admin
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {pending.map(member => {
                const name = member.user.displayName || member.user.username.replace(/^@/, '');
                const isSelf = member.userId === currentUserId;
                const handleClick = () => {
                  if (isSelf) openPanel('settings', <SettingsPanel />, 'Settings', 'center', undefined, undefined, true);
                  else openUserProfile(member.userId, name, member.user.profileImage);
                };
                return (
                  <div key={member.userId} className={styles.memberRow} style={{ opacity: 0.5 }}>
                    <PresenceAvatar displayName={name} profileImage={member.user.profileImage} info={{ status: 'offline', lastSeen: null }} size={40} onClick={handleClick} />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName} style={{ cursor: 'pointer' }} onClick={handleClick}>{name}{isSelf ? ' (you)' : ''}</span>
                      <span className={styles.memberBadge} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        <i className="fas fa-clock" style={{ fontSize: '8px' }} /> Pending
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Add Members */}
        {isAdmin && (
          <button className={styles.addMembersBtn} onClick={openAddMembersPanel}>
            <i className="fas fa-user-plus" /> Add Members
          </button>
        )}

        {/* Leave */}
        <div className={styles.actions}>
          <button className={styles.leaveBtn} onClick={handleLeaveGroup}>
            <i className="fas fa-arrow-right-from-bracket" /> Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}
