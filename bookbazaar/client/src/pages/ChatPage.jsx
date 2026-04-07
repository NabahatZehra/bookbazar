import React, { useState, useEffect, useRef } from 'react';
import { useSocketContext } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';

const ChatPage = () => {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocketContext();
  const { userId } = useParams();
  
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get('/chat/conversations');
        if (res.data.success) {
          setConversations(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      }
    };
    if (user) fetchConversations();
  }, [user]);

  // If navigated from OrderConfirmation / BookDetails, auto-select the conversation.
  useEffect(() => {
    if (!userId) return;
    if (!conversations || conversations.length === 0) return;
    const found = conversations.find(
      (conv) => conv.user?._id?.toString() === userId.toString()
    );
    if (found?.user) {
      setSelectedUser(found.user);
      setShowConversations(false);
    }
  }, [userId, conversations]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser) return;
      try {
        const res = await api.get(`/chat/messages/${selectedUser._id}`);
        if (res.data.success) {
          setMessages(res.data.data);
          
          if (socket) {
            socket.emit('mark_read', { senderId: selectedUser._id });
          }
          
          setConversations(prev => prev.map(conv => {
            if (conv.user._id === selectedUser._id) {
              return { ...conv, unreadCount: 0 };
            }
            return conv;
          }));
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };
    
    if (selectedUser) {
      if (socket) {
        socket.emit('join_conversation', selectedUser._id);
      }
      fetchMessages();
    }
  }, [selectedUser, socket]);

  useEffect(() => {
    if (!socket) return;
    
    const handleReceiveMessage = (message) => {
      if (
        selectedUser && 
        (message.senderId === selectedUser._id || message.receiverId === selectedUser._id)
      ) {
        setMessages(prev => {
          if (prev.find(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        
        if (message.senderId === selectedUser._id && message.receiverId === user._id) {
          socket.emit('mark_read', { senderId: selectedUser._id });
        }
      }
      
      setConversations(prev => {
        const partnerId = message.senderId === user._id ? message.receiverId : message.senderId;
        const exists = prev.find(c => c.user._id === partnerId);
        
        if (exists) {
           return prev.map(c => {
             if (c.user._id === partnerId) {
                return {
                  ...c,
                  lastMessage: message,
                  unreadCount: (message.senderId === partnerId && (!selectedUser || selectedUser._id !== partnerId)) 
                                ? c.unreadCount + 1 
                                : c.unreadCount
                };
             }
             return c;
           }).sort((a,b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));
        } else {
          api.get('/chat/conversations').then(res => {
            if (res.data.success) setConversations(res.data.data);
          });
          return prev;
        }
      });
    };

    const handleUserTyping = ({ senderId, isTyping }) => {
      if (selectedUser && senderId === selectedUser._id) {
        setOtherUserTyping(isTyping);
      }
    };

    const handleMessagesRead = ({ readerId }) => {
      if (selectedUser && readerId === selectedUser._id) {
        setMessages(prev => prev.map(m => (!m.isRead ? { ...m, isRead: true } : m)));
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, selectedUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !socket) return;

    const messageData = {
      receiverId: selectedUser._id,
      text: newMessage,
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
    socket.emit('typing', { receiverId: selectedUser._id, isTyping: false });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !selectedUser) return;
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { receiverId: selectedUser._id, isTyping: true });
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { receiverId: selectedUser._id, isTyping: false });
    }, 2000);
  };
  
  const selectConversation = (convUser) => {
    setSelectedUser(convUser);
    setShowConversations(false);
  };

  if (!user) return <div className="p-8 text-center text-gray-500">Please log in to view messages.</div>;

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 max-w-6xl mx-auto">
      {/* LEFT PANEL */}
      <div className={`w-full md:w-1/3 bg-gray-50 border-r border-gray-200 flex-shrink-0 flex flex-col ${!showConversations ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">Messages</h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 mt-10 p-4">No conversations yet</div>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.user._id} 
                onClick={() => selectConversation(conv.user)}
                className={`p-3 rounded-lg cursor-pointer flex items-center transition-all ${selectedUser?._id === conv.user._id ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-white hover:shadow-sm border border-transparent'}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm overflow-hidden">
                    {conv.user.avatar ? (
                       <img src={conv.user.avatar} alt={conv.user.name} className="w-full h-full object-cover" />
                    ) : (
                       conv.user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isUserOnline(conv.user._id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-semibold text-gray-800 truncate pr-2">{conv.user.name}</h3>
                    {conv.lastMessage && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(conv.lastMessage.timestamp), 'h:mm a')}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {conv.lastMessage?.text || 'No messages'}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="ml-2 w-5 h-5 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center font-bold">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={`flex-1 flex flex-col bg-gray-50 relative ${showConversations ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 flex items-center sticky top-0 z-10 shadow-sm">
              <button 
                className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden text-gray-600"
                onClick={() => setShowConversations(true)}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm overflow-hidden">
                   {selectedUser.avatar ? (
                       <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                    ) : (
                       selectedUser.name.charAt(0).toUpperCase()
                    )}
                </div>
              </div>
              <div className="ml-3">
                <h3 className="font-bold text-gray-800">{selectedUser.name}</h3>
                <p className="text-xs font-medium flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${isUserOnline(selectedUser._id) ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className={isUserOnline(selectedUser._id) ? 'text-green-600' : 'text-gray-500'}>
                    {isUserOnline(selectedUser._id) ? 'Online' : 'Offline'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg, index) => {
                const isMine = String(msg.senderId) === String(user.id || user._id);
                const showDate = index === 0 || new Date(messages[index - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                
                return (
                  <React.Fragment key={msg._id || index}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs font-medium text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                          {format(new Date(msg.timestamp), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMine 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                      }`}>
                        <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                        <div className={`text-[10px] mt-1.5 flex justify-end items-center gap-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                          {format(new Date(msg.timestamp), 'h:mm a')}
                          {isMine && (
                            <span className="ml-1">
                              {msg.isRead ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 text-gray-500 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5 w-16">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-gray-50 p-1.5 rounded-3xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent px-4 py-2.5 outline-none text-[15px] text-gray-800 placeholder-gray-400 disabled:opacity-50"
                  disabled={!socket}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || !socket}
                  className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0 mb-0.5 mr-0.5"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400 bg-gray-50 p-8 text-center">
             <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" /></svg>
             </div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">Your Messages</h3>
            <p className="max-w-md text-[15px]">Select a conversation from the sidebar to begin messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
