import { UserButton } from "@clerk/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStreamChat } from "../hooks/useStreamChat";
import PageLoader from "../components/PageLoader";

import {
  Chat,
  Channel,
  ChannelList,
  MessageList,
  MessageInput,
  Thread,
  Window,
} from "stream-chat-react";

import "../styles/stream-chat-theme.css";
import { HashIcon, PlusIcon, UsersIcon } from "lucide-react";
import CreateChannelModal from "../components/CreateChannelModal";
import CustomChannelPreview from "../components/CustomChannelPreview";
import UsersList from "../components/UsersList";
import CustomChannelHeader from "../components/CustomChannelHeader";

const HomePage = () => {
  
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeChannel, setActiveChannel] = useState(null);

    const [searchParams, setSearchParams] = useSearchParams();

    const { chatClient, error, isLoading } = useStreamChat();

    /**
     * Sync active channel with URL
     */
    useEffect(() => {
        if (!chatClient) return;
        const channelId = searchParams.get("channel");
        if (channelId) {
            const channel = chatClient.channel("messaging", channelId);
            channel.watch().then(() => {
                setActiveChannel(channel);
            });
        }
    }, [chatClient, searchParams]);

    /**
     * Auto select first channel if none selected
     */
    useEffect(() => {
        if (!chatClient) return;
        const loadDefaultChannel = async () => {
            const filters = { members: { $in: [chatClient.user?.id] } };
            const channels = await chatClient.queryChannels(filters, {
                last_message_at: -1,
            });
            if (channels.length > 0 && !searchParams.get("channel")) {
                const firstChannel = channels[0];
                setSearchParams({ channel: firstChannel.id });
                setActiveChannel(firstChannel);
            }
        };
        loadDefaultChannel();
    }, [chatClient]);

    // ERROR UI
    if (error) return (
        <div className="flex h-screen items-center justify-center text-red-500">
            Failed to load chat
        </div>
    );

    if (isLoading || !chatClient) return <PageLoader />;

    return (
        <div className="chat-wrapper">
            <Chat client={chatClient}>
                <div className="chat-container">
                    {/* LEFT SIDEBAR */}
                    <div className="str-chat__channel-list">
                        <div className="team-channel-list">
                            {/* HEADER */}
                            <div className="team-channel-list__header gap-4">
                                <div className="brand-container">
                                    <img src="/logo.png" alt="Zync" className="brand-logo" />
                                    <span className="brand-name">Zync</span>
                                </div>
                                <div className="user-button-wrapper">
                                    <UserButton />
                                </div>
                            </div>
                            {/* CONTENT */}
                            <div className="team-channel-list__content">
                                {/* CREATE CHANNEL */}
                                <div className="create-channel-section">
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="create-channel-btn"
                                    >
                                        <PlusIcon className="size-4" />
                                        <span>Create Channel</span>
                                    </button>
                                </div>
                                {/* CHANNEL LIST */}
                                <ChannelList
                                filters={{ members: { $in: [chatClient.user?.id] } }}
                                options={{
                                    state: true,
                                    watch: true,
                                    presence: true,
                                }}
                                sort={{ last_message_at: -1 }}
                                Preview={(props) => (
                                    <CustomChannelPreview
                                    {...props}
                                    activeChannel={activeChannel}
                                    setActiveChannel={(channel) => {
                                        setActiveChannel(channel);
                                        setSearchParams({ channel: channel.id });
                                    }}
                                    />
                                )}
                                List={({ children, loading, error }) => (
                                    <div className="channel-sections">
                                        {/* CHANNELS */}
                                        <div className="section-header">
                                            <div className="section-title">
                                                <HashIcon className="size-4" />
                                                <span>Channels</span>
                                            </div>
                                        </div>
                                        {loading && (
                                            <div className="loading-message">
                                                Loading Channels...
                                            </div>
                                        )}
                                        {error && (
                                            <div className="error-message">
                                                Failed to load channels
                                            </div>
                                        )}
                                        {!loading && !error && (
                                            <div className="channels-list">{children}</div>
                                        )}
                                        {/* DIRECT MESSAGES */}
                                        <div className="section-header direct-messages">
                                            <div className="section-title">
                                                <UsersIcon className="size-4" />
                                                <span>Direct Messages</span>
                                            </div>
                                        </div>
                                        <UsersList
                                        activeChannel={activeChannel}
                                        setActiveChannel={(channel) => {
                                            setActiveChannel(channel);
                                            setSearchParams({ channel: channel.id });
                                        }}
                                        />
                                    </div>
                                )}
                                />
                            </div>
                        </div>
                    </div>
                    {/* RIGHT CHAT AREA */}
                    <div className="chat-main">
                        {activeChannel ? (
                            <Channel channel={activeChannel} key={activeChannel.id}>
                                <Window>
                                    <CustomChannelHeader />
                                    <MessageList />
                                    <MessageInput />
                                </Window>
                                <Thread />
                            </Channel>
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                                Select a channel to start chatting
                            </div>
                        )}
                    </div>
                </div>

                {isCreateModalOpen && (
                    <CreateChannelModal
                        onClose={() => setIsCreateModalOpen(false)}
                    />
                )}
            </Chat>
        </div>
    );
};

export default HomePage;