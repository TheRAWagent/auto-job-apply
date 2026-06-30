# Extension UI design

1. **Popup UI**: The popup UI is the main interface that users interact with when they click on the extension icon in their browser. It provides a user-friendly way to manage resumes, settings, and other functionalities.

2. Onboarding Steps: The onboarding process is designed to guide users through the initial setup of the extension. It includes steps for uploading resumes, configuring settings, and understanding how to use the extension effectively.

3. **Settings**: The settings section allows users to customize their experience with the extension. Users can manage preferences related to resume formats, LLM providers, and other configurations.

# Onboarding flow
1. **Step 1: Setting local password**: Users are prompted to set a local password for secure access to their resume, autofill and other features. This step ensures that sensitive information is protected.

2. **Step 2: Setting up Openai compatible API key**: Users are guided to set up an OpenAI compatible API key and base URL. This step is crucial for enabling the extension to interact with language models for autofill and other functionalities.

# **Step 3: Profile creation flow**: Users can create profiles that include their resume and other relevant information. This step allows users to manage multiple profiles for different job applications.

## Fields to be filled in profile creation flow
- **Profile Name**: A unique name for the profile to easily identify it.
- **Resume PDF**: Users can upload their resume in PDF format using file or link.
- **Submit**: Once the user has filled in all the required fields and is satisfied with the information provided, they can submit the profile. The extension will then save the profile for future use in job applications.