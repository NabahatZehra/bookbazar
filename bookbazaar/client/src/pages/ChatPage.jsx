import React, { useState, useEffect, useRef } from 'react';
import { useSocketContext } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ChatPage = () => {
  const { user } = useAuth();
  const { socket, onlineUsers, isUserOnline } = useSocketContext();
  
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom whenever messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await api.get('/chat/conversations');
        if (data.success) {
          setConversations(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };
    if (user) fetchConversations();
  }, [user]);

  // Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      // If the message belongs to the currently active chat, append it to the chat window
      if (
        activeChat &&
        (message.senderId === activeChat._id || message.receiverId === activeChat._id)
      ) {
        setMessages((prev) => [...prev, message]);
        
        // Let the sender know we read it immediately
        if (message.receiverId === user._id) {
          socket.emit('mark_read', { senderId: message.senderId });
        }
      } else {
        // Update unread badges on the conversation list
        setConversations((prevConvs) => {
          return prevConvs.map((c) => {
            if (c.user._id === message.senderId) {
              return { ...c, lastMessage: message, unreadCount: c.unreadCount + 1 };
            }
            return c;
          });
        });
      }
    };

    const handleUserTyping = ({ senderId, isTyping }) => {
      if (activeChat && senderId === activeChat._id) {
        setOtherUserTyping(isTyping);
      }
    };

    const handleMessagesRead = ({ readerId }) => {
      if (activeChat && readerId === activeChat._id) {
        setMessages((prev) => 
          prev.map((m) => (m.receiverId === readerId ? { ...m, isRead: true } : m))
        );
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
  }, [socket, activeChat, user]);

  // Handle selecting a conversation
  const handleSelectChat = async (chatUser) => {
    setActiveChat(chatUser);
    
    // Join conversation room
    if (socket) {
      socket.emit('join_conversation', chatUser._id);
    }

    try {
      const { data } = await api.get(`/chat/messages/${chatUser._id}`);
      if (data.success) {
        setMessages(data.data);
        
        // Clear unread count locally
        setConversations((prev) =>
          prev.map((c) => (c.user._id === chatUser._id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  // Handle typing indicator logic
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!socket || !activeChat) return;
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { receiverId: activeChat._id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { receiverId: activeChat._id, isTyping: false });
    }, 2000);
  };

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !activeChat) return;

    socket.emit('send_message', {
      receiverId: activeChat._id,
      text: newMessage,
    });

    setNewMessage('');
    setIsTyping(false);
    socket.emit('typing', { receiverId: activeChat._id, isTyping: false });
    clearTimeout(typingTimeoutRef.current);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
      
      {/* Left Panel: Conversation List */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>
        
        <div className="overflow-y-auto flex-grow">
          {conversations.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">No active conversations</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.user._id}
                onClick={() => handleSelectChat(conv.user)}
                className={`flex items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition ${
                  activeChat?._id === conv.user._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="relative">
                  <img src={conv.user.avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                  {isUserOnline(conv.user._id) && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                
                <div className="ml-4 flex-grow overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 truncate">{conv.user.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {conv.lastMessage?.text || 'Sent an attachment'}
                  </p>
                </div>
                
                {conv.unreadCount > 0 && (
                  <div className="ml-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Chat Box */}
      <div className={`w-full md:w-2/3 flex flex-col bg-gray-50 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {!activeChat ? (
          <div className="flex-grow flex flex-col justify-center items-center text-gray-400">
            <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-xl">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm z-10">
              <div className="flex items-center">
                <button 
                  onClick={() => setActiveChat(null)} 
                  className="mr-4 text-gray-500 hover:text-blue-600 md:hidden"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <img src={activeChat.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-800">{activeChat.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center">
                    {isUserOnline(activeChat._id) ? (
                      <><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online</>
                    ) : (
                      <><span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span> Offline</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => {
                const isMine = msg.senderId === user?._id;
                return (
                  <div key={index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      isMine 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'
                    }`}>
                      <p className="break-words">{msg.text}</p>
                      <div className={`text-[10px] mt-1 flex items-center justify-end ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMine && msg.isRead && (
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-500 text-xs px-4 py-2 rounded-2xl rounded-bl-none flex space-x-1 items-center h-8">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex flex-row items-center bg-gray-100 rounded-full px-4py-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-grow bg-transparent focus:outline-none py-3 px-4"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2.5 mx-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
